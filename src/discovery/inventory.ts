import { extname, basename, dirname } from "node:path";
import type { Diagnostic, Inventory, InventoryFile, SnapshotReader } from "../contracts/types.js";
import { sha256, stableId, compareBytes } from "../platform/hash.js";

const EXCLUDED_SEGMENTS = new Set([".git", "node_modules", "bin", "obj", "target", "dist", "build", "coverage", ".knowledge", ".venv", "venv", "vendor"]);
const BINARY_EXTENSIONS = new Set([".dll", ".exe", ".class", ".jar", ".zip", ".png", ".jpg", ".jpeg", ".gif", ".pdf", ".pdb", ".so", ".dylib", ".woff", ".woff2"]);
const LANGUAGE_BY_EXTENSION: Record<string, string> = { ".cs": "c_sharp", ".java": "java", ".ts": "typescript", ".tsx": "tsx", ".js": "javascript", ".jsx": "javascript", ".py": "python", ".xml": "xml", ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml" };
const MANIFESTS = new Set(["package.json", "angular.json", "pom.xml", "build.gradle", "build.gradle.kts", "pyproject.toml", "requirements.txt", "web.xml", "weblogic.xml", "application.xml"]);

export async function buildInventory(reader: SnapshotReader, options: { maxFileBytes?: number; maxFiles?: number } = {}): Promise<Inventory> {
  return await buildInventoryInternal(reader, null, null, options);
}

/** Rebuild the current tree while reopening only files reported by Git as changed. */
export async function buildIncrementalInventory(reader: SnapshotReader, previous: Inventory, changedPaths: ReadonlySet<string>, options: { maxFileBytes?: number; maxFiles?: number } = {}): Promise<Inventory> {
  if (previous.repository_id !== reader.snapshot.repository_id) throw new Error("El inventario base pertenece a otro repositorio.");
  return await buildInventoryInternal(reader, previous, changedPaths, options);
}

async function buildInventoryInternal(reader: SnapshotReader, previous: Inventory | null, changedPaths: ReadonlySet<string> | null, options: { maxFileBytes?: number; maxFiles?: number }): Promise<Inventory> {
  const maxFileBytes = options.maxFileBytes ?? 2 * 1024 * 1024;
  const maxFiles = options.maxFiles ?? 100_000;
  const entries = [...await reader.list()].sort((a, b) => compareBytes(a.relative_path, b.relative_path));
  if (entries.length > maxFiles) throw new Error(`El snapshot contiene ${entries.length} entradas; límite ${maxFiles}.`);
  const files: InventoryFile[] = [];
  const diagnostics: Diagnostic[] = [];
  const technologySignals = previous === null ? new Set<string>() : technologySignalsFromInventory(previous);
  const previousFiles = new Map((previous?.files ?? []).map((file) => [file.relative_path, file]));
  let excluded = 0, failed = 0, unsupported = 0, processed = 0;
  const exclusionReasons: Record<string, number> = {};
  for (const entry of entries) {
    const reusable = changedPaths !== null && !changedPaths.has(entry.relative_path) ? previousFiles.get(entry.relative_path) : undefined;
    if (reusable !== undefined) {
      files.push({ ...reusable });
      if (reusable.excluded_reason !== null) { excluded += 1; exclusionReasons[reusable.excluded_reason] = (exclusionReasons[reusable.excluded_reason] ?? 0) + 1; }
      else if (reusable.language === null && !isManifest(reusable.relative_path)) unsupported += 1;
      else processed += 1;
      continue;
    }
    const reason = exclusionReason(entry.relative_path, entry.kind, entry.size, maxFileBytes);
    if (reason !== null) {
      excluded += 1; exclusionReasons[reason] = (exclusionReasons[reason] ?? 0) + 1;
      files.push({ relative_path: entry.relative_path, size: entry.size, source_hash: entry.object_id, classification: "other", language: null, excluded_reason: reason });
      continue;
    }
    const extension = extname(entry.relative_path).toLocaleLowerCase("en-US");
    const language = LANGUAGE_BY_EXTENSION[extension] ?? null;
    if (language === null && !isManifest(entry.relative_path)) {
      unsupported += 1;
      files.push({ relative_path: entry.relative_path, size: entry.size, source_hash: entry.object_id, classification: classify(entry.relative_path), language: null, excluded_reason: null });
      continue;
    }
    try {
      const bytes = await reader.read(entry.relative_path, { maxBytes: maxFileBytes });
      const classification = classify(entry.relative_path);
      files.push({ relative_path: entry.relative_path, size: bytes.byteLength, source_hash: sha256(bytes), classification, language, excluded_reason: null });
      collectTechnologySignals(entry.relative_path, Buffer.from(bytes).toString("utf8"), technologySignals);
      processed += 1;
    } catch (error) {
      failed += 1;
      const id = stableId("diagnostic", reader.snapshot.id, entry.relative_path, "READ_FAILED");
      diagnostics.push({ schema_version: 3, id, severity: "error", code: "READ_FAILED", scope: entry.relative_path, message: error instanceof Error ? error.message : String(error), evidence_ids: [], suggested_action: "Revise disponibilidad y tamaño; los otros archivos se conservaron." });
    }
  }
  const projects = files.filter((file) => file.excluded_reason === null && isManifest(file.relative_path)).map((file) => ({ id: stableId("project", reader.snapshot.repository_id, dirname(file.relative_path)), root: dirname(file.relative_path).replaceAll("\\", "/"), manifest: file.relative_path, technologies: inferTechnologies(file.relative_path, technologySignals) }));
  const candidate_stacks = detectCandidateStacks(reader.snapshot.repository_id, files, technologySignals);
  const eligible = entries.length - excluded;
  return { schema_version: 3, repository_id: reader.snapshot.repository_id, snapshot_id: reader.snapshot.id, projects, files, candidate_stacks, coverage: { discovered: entries.length, excluded, eligible, processed, failed, unsupported, not_scanned: eligible - processed - failed - unsupported, capabilities: [], exclusion_reasons: exclusionReasons }, diagnostics };
}

function technologySignalsFromInventory(inventory: Inventory): Set<string> {
  const result = new Set<string>();
  const mapping: Record<string, string> = { dotnet: "dotnet", "java-spring": "spring", "java-webflux": "webflux", "java-weblogic": "jee", "js-angular": "angular", "js-react": "react", "node-express": "express" };
  for (const candidate of inventory.candidate_stacks) {
    const signal = mapping[candidate.plugin_id];
    if (signal !== undefined) result.add(signal);
  }
  return result;
}

function exclusionReason(path: string, kind: string, size: number, maxBytes: number): string | null {
  const segments = path.split("/");
  if (segments.some((segment) => EXCLUDED_SEGMENTS.has(segment))) return "excluded_directory";
  if (kind === "submodule") return "submodule_not_authorized";
  if (kind === "symlink") return "symlink";
  if (size > maxBytes) return "size_limit";
  if (BINARY_EXTENSIONS.has(extname(path).toLocaleLowerCase("en-US"))) return "binary";
  if (/(^|\/)(\.env|id_rsa|id_ed25519|.*\.(pfx|p12|pem|key))$/iu.test(path)) return "credential_file";
  return null;
}

function classify(path: string): InventoryFile["classification"] {
  const name = basename(path);
  if (isManifest(path) || /(?:^|\/)(appsettings[^/]*\.json)$/iu.test(path)) return "manifest";
  if (/(?:^|\/)(test|tests|spec|specs)(?:\/|$)|(?:\.|_)(?:test|spec)\.[^.]+$/iu.test(path)) return "test";
  if (/\.(?:md|adoc|rst)$/iu.test(path)) return "documentation";
  if (LANGUAGE_BY_EXTENSION[extname(path).toLocaleLowerCase("en-US")] !== undefined) return "source";
  return "other";
}

function inferTechnologies(path: string, signals: ReadonlySet<string>): string[] {
  const name = basename(path).toLocaleLowerCase("en-US");
  if (name === "package.json") return ["nodejs", ...(signals.has("angular") ? ["angular"] : []), ...(signals.has("react") ? ["react"] : []), ...(signals.has("express") ? ["express"] : [])];
  if (name === "pom.xml" || name.startsWith("build.gradle")) return ["java", ...(signals.has("spring") ? ["spring"] : []), ...(signals.has("webflux") ? ["webflux"] : [])];
  if (name === "pyproject.toml" || name === "requirements.txt") return ["python"];
  if (name.endsWith(".csproj")) return ["dotnet"];
  if (["web.xml", "weblogic.xml", "application.xml"].includes(name)) return ["java-jee"];
  return [];
}

function detectCandidateStacks(repositoryId: string, files: InventoryFile[], signals: ReadonlySet<string>) {
  const byLanguage = new Map<string, string[]>();
  for (const file of files) if (file.language !== null && file.excluded_reason === null) byLanguage.set(file.language, [...(byLanguage.get(file.language) ?? []), file.relative_path]);
  const mappings: Array<[string, string[], boolean]> = [
    ["python", ["python"], byLanguage.has("python")],
    ["dotnet", ["c_sharp", "xml"], signals.has("dotnet")],
    ["java-spring", ["java"], signals.has("spring")],
    ["java-webflux", ["java"], signals.has("webflux")],
    ["java-weblogic", ["java", "xml"], signals.has("jee")],
    ["js-angular", ["typescript"], signals.has("angular")],
    ["js-react", ["typescript", "tsx", "javascript"], signals.has("react")],
    ["node-express", ["typescript", "javascript"], signals.has("express")],
  ];
  return mappings.flatMap(([plugin, languages, detected]) => {
    if (!detected) return [];
    const paths = languages.flatMap((language) => byLanguage.get(language) ?? []);
    return paths.length === 0 ? [] : [{ plugin_id: plugin, component_id: repositoryId, languages, evidence_paths: paths.slice(0, 20) }];
  });
}

function isManifest(path: string): boolean {
  const name = basename(path).toLocaleLowerCase("en-US");
  return MANIFESTS.has(name) || name.endsWith(".csproj");
}

function collectTechnologySignals(path: string, source: string, signals: Set<string>): void {
  const name = basename(path).toLocaleLowerCase("en-US");
  const sample = source.slice(0, 512 * 1024).toLocaleLowerCase("en-US");
  if (name.endsWith(".csproj") || /\bmicrosoft\.aspnetcore\b|\b(?:app|group)\.map(?:get|post|put|patch|delete)\s*\(/u.test(sample)) signals.add("dotnet");
  if (name === "angular.json" || /["']@angular\/core["']/u.test(sample)) signals.add("angular");
  if (/["'](?:react|react-dom)["']/u.test(sample) || /\bfrom\s+["']react["']/u.test(sample)) signals.add("react");
  if ((name === "package.json" && /["']express["']\s*:/u.test(sample)) || /\bfrom\s+["']express["']|\brequire\s*\(\s*["']express["']/u.test(sample)) signals.add("express");
  if (/\borg\.springframework\b|\bspring-boot\b/u.test(sample)) signals.add("spring");
  if (/\bspring-boot-starter-webflux\b|\bRouterFunction\s*<|\bRouterFunctions\.(?:route|nest)\s*\(|\bServerRequest\b|\bServerResponse\b/u.test(source.slice(0, 512 * 1024))) signals.add("webflux");
  if (["web.xml", "weblogic.xml", "application.xml"].includes(name) || /\b(?:jakarta|javax)\.(?:ws\.rs|ejb|jms)\b/u.test(sample)) signals.add("jee");
}
