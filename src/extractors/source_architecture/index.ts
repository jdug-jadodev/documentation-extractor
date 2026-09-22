import { posix } from "node:path";
import type { CandidateStack, CapabilityCoverage, Diagnostic, Evidence, ExtractionOptions, ExtractionResult, ExtractorPlugin, Fact, Inventory, SnapshotEntry, SnapshotReader } from "../../contracts/types.js";
import { compareBytes, sha256, stableId } from "../../platform/hash.js";

const SOURCE = /\.(?:[cm]?[jt]s|tsx|jsx)$/iu;

export class SourceArchitecturePlugin implements ExtractorPlugin {
  readonly id = "source-architecture";
  readonly version = "1.1.0";
  readonly supported_languages = ["javascript", "typescript", "tsx"] as const;
  readonly capabilities = { modules: "implemented", symbols: "partial", imports: "implemented", manifests: "implemented" } as const;
  readonly rule_versions = { "source.module": "1", "source.symbol": "2", "source.import": "1", "package.dependencies": "1", "package.scripts": "1", "package.runtime": "1" } as const;

  async detect(inventory: Inventory): Promise<CandidateStack[]> {
    const paths = inventory.files.filter((file) => file.excluded_reason === null && SOURCE.test(file.relative_path)).map((file) => file.relative_path);
    return paths.length === 0 ? [] : [{ plugin_id: this.id, component_id: inventory.repository_id, languages: [...this.supported_languages], evidence_paths: paths.slice(0, 20) }];
  }

  async extract(reader: SnapshotReader, component: CandidateStack, options: ExtractionOptions): Promise<ExtractionResult> {
    const entries = [...await reader.list()].filter((entry) => entry.kind === "blob").sort((a, b) => compareBytes(a.relative_path, b.relative_path));
    const sourcePaths = new Set(entries.filter((entry) => SOURCE.test(entry.relative_path)).map((entry) => entry.relative_path));
    const facts: Fact[] = [], evidence: Evidence[] = [], diagnostics: Diagnostic[] = [];
    const processed = { modules: 0, symbols: 0, imports: 0, manifests: 0 };
    for (const entry of entries) {
      if ((!SOURCE.test(entry.relative_path) && !/(^|\/)package\.json$/iu.test(entry.relative_path)) || entry.size > options.max_file_bytes) continue;
      let source: string;
      try { source = Buffer.from(await reader.read(entry.relative_path, { maxBytes: options.max_file_bytes, ...(options.signal === undefined ? {} : { signal: options.signal }) })).toString("utf8"); }
      catch (error) { diagnostics.push(readDiagnostic(reader, entry.relative_path, error)); continue; }
      if (SOURCE.test(entry.relative_path)) {
        processed.modules += 1;
        addFact(reader, component.component_id, entry, source, "source_module", { path: entry.relative_path, language: language(entry.relative_path), layer: layer(entry.relative_path), role: role(entry.relative_path) }, "source.module", 0, Math.min(Buffer.byteLength(source, "utf8"), 1), facts, evidence);
        for (const descriptor of symbols(source)) {
          processed.symbols += 1;
          addFact(reader, component.component_id, entry, source, "code_symbol", { ...descriptor.value, source_path: entry.relative_path, layer: layer(entry.relative_path), role: role(entry.relative_path) }, "source.symbol", descriptor.index, descriptor.index + descriptor.text.length, facts, evidence);
        }
        for (const descriptor of imports(source, entry.relative_path, sourcePaths)) {
          processed.imports += 1;
          addFact(reader, component.component_id, entry, source, "module_dependency", descriptor.value, "source.import", descriptor.index, descriptor.index + descriptor.text.length, facts, evidence);
        }
      } else {
        processed.manifests += 1;
        extractPackageJson(reader, component.component_id, entry, source, facts, evidence, diagnostics);
      }
    }
    const coverage_by_capability: CapabilityCoverage[] = Object.entries(this.capabilities).map(([capability, status]) => ({ capability, status, processed: processed[capability as keyof typeof processed], failed: 0, limitations: status === "partial" ? ["Las declaraciones din\u00e1micas o generadas pueden requerir interpretaci\u00f3n adicional."] : [] }));
    return { plugin_id: this.id, plugin_version: this.version, facts: unique(facts), evidence: unique(evidence), diagnostics, coverage_by_capability, dependencies: entries.filter((entry) => SOURCE.test(entry.relative_path) || /(^|\/)package\.json$/iu.test(entry.relative_path)).map((entry) => entry.relative_path) };
  }
}

export function createSourceArchitecturePlugin(): ExtractorPlugin { return new SourceArchitecturePlugin(); }

function symbols(source: string): Array<{ index: number; text: string; value: Record<string, unknown> }> {
  const patterns: Array<[string, RegExp]> = [
    ["class", /\b(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gu],
    ["interface", /\bexport\s+interface\s+([A-Za-z_$][\w$]*)/gu],
    ["type", /\bexport\s+type\s+([A-Za-z_$][\w$]*)\s*=/gu],
    ["enum", /\bexport\s+(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/gu],
    ["function", /\bexport\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gu],
    ["function", /\bexport\s+const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/gu]
  ];
  const result: Array<{ index: number; text: string; value: Record<string, unknown> }> = patterns.flatMap(([kind, pattern]) => [...source.matchAll(pattern)].map((match) => {
    const name = match[1] ?? "unknown";
    return { index: match.index ?? 0, text: match[0], value: { name, symbol_type: kind, exported: true, signature: compactSignature(match[0]), description: describeSymbol(kind, name, []) } };
  }));
  const classPattern = /\b(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)[^\{]*\{/gu;
  for (const classMatch of source.matchAll(classPattern)) {
    const className = classMatch[1] ?? "unknown";
    const open = (classMatch.index ?? 0) + classMatch[0].lastIndexOf("{");
    const close = matchingBrace(source, open);
    if (close === null) continue;
    const body = source.slice(open + 1, close);
    const methodPattern = /(?:^|\n)\s*(?:(public|private|protected)\s+)?(?:(static)\s+)?(?:(async)\s+)?(?:(get|set)\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?::[^\{;\n]+)?\s*\{/gu;
    for (const methodMatch of body.matchAll(methodPattern)) {
      const name = methodMatch[5] ?? "unknown";
      if (["if", "for", "while", "switch", "catch", "function"].includes(name)) continue;
      const absolute = open + 1 + (methodMatch.index ?? 0) + methodMatch[0].search(/\S/u);
      const methodOpen = open + 1 + (methodMatch.index ?? 0) + methodMatch[0].lastIndexOf("{");
      const methodClose = matchingBrace(source, methodOpen) ?? methodOpen;
      const calls = calledSymbols(source.slice(methodOpen + 1, methodClose), name);
      const signature = compactSignature(methodMatch[0].replace(/\{$/u, ""));
      result.push({
        index: absolute,
        text: signature,
        value: {
          name,
          symbol_type: "method",
          class_name: className,
          exported: false,
          visibility: methodMatch[1] ?? "default",
          static: methodMatch[2] === "static",
          async: methodMatch[3] === "async",
          accessor: methodMatch[4] ?? null,
          parameters: parameterNames(methodMatch[6] ?? ""),
          signature,
          calls,
          description: describeSymbol("method", name, calls),
          description_basis: calls.length > 0 ? "nombre y llamadas observadas" : "nombre y firma observados"
        }
      });
    }
  }
  return result;
}

function matchingBrace(source: string, open: number): number | null {
  if (source[open] !== "{") return null;
  let depth = 0, quote: string | null = null, escaped = false, lineComment = false, blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index]!, next = source[index + 1] ?? "";
    if (lineComment) { if (char === "\n") lineComment = false; continue; }
    if (blockComment) { if (char === "*" && next === "/") { blockComment = false; index += 1; } continue; }
    if (quote !== null) { if (escaped) escaped = false; else if (char === "\\") escaped = true; else if (char === quote) quote = null; continue; }
    if (char === "/" && next === "/") { lineComment = true; index += 1; continue; }
    if (char === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === "`") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return index;
  }
  return null;
}

function parameterNames(value: string): string[] {
  return value.split(",").map((item) => item.trim().replace(/^(?:\.\.\.)?/u, "").split(/[?:=]/u)[0]?.trim() ?? "").filter(Boolean);
}

function calledSymbols(body: string, ownName: string): string[] {
  const excluded = new Set(["if", "for", "while", "switch", "catch", "return", "throw", "new", "super", ownName]);
  return [...new Set([...body.matchAll(/\b(?:this\.)?([A-Za-z_$][\w$]*)\s*\(/gu)].map((match) => match[1] ?? "").filter((name) => name !== "" && !excluded.has(name)))].slice(0, 12);
}

function compactSignature(value: string): string { return value.replace(/\s+/gu, " ").trim().slice(0, 300); }

function describeSymbol(kind: string, name: string, calls: readonly string[]): string {
  const words = name.replace(/([a-z0-9])([A-Z])/gu, "$1 $2").replace(/[_-]+/gu, " ").toLocaleLowerCase("es-CO");
  const verb = /^(get|find|load|read|fetch)\b/u.test(words) ? "Obtiene o consulta"
    : /^(create|add|insert|register|save)\b/u.test(words) ? "Crea o registra"
    : /^(update|set|change)\b/u.test(words) ? "Actualiza"
    : /^(delete|remove|clear|revoke)\b/u.test(words) ? "Elimina o revoca"
    : /^(validate|check|assert|verify)\b/u.test(words) ? "Valida"
    : /^(build|make|compose|generate)\b/u.test(words) ? "Construye o genera"
    : /^(map|convert|transform|to)\b/u.test(words) ? "Transforma"
    : /^(send|publish|emit|notify)\b/u.test(words) ? "Envía o publica"
    : /^(handle|process|execute|run)\b/u.test(words) ? "Procesa"
    : kind === "class" ? "Agrupa la responsabilidad"
    : kind === "method" ? "Ejecuta la operación"
    : "Implementa";
  const callText = calls.length > 0 ? `; invoca ${calls.join(", ")}` : "";
  return `${verb} asociada a «${words}»${callText}. Descripción derivada del código estático.`;
}

function imports(source: string, sourcePath: string, paths: ReadonlySet<string>): Array<{ index: number; text: string; value: Record<string, unknown> }> {
  const pattern = /\bimport\s+(?!\()([\s\S]{1,300}?)\s+from\s+["']([^"']+)["']|\bimport\s+["']([^"']+)["']/gu;
  return [...source.matchAll(pattern)].map((match) => {
    const specifier = match[2] ?? match[3] ?? "";
    const clause = match[1]?.trim() ?? "side-effect";
    return { index: match.index ?? 0, text: match[0], value: { source_path: sourcePath, specifier, target_path: specifier.startsWith(".") ? resolveModule(sourcePath, specifier, paths) : null, external: !specifier.startsWith("."), imports: importedNames(clause) } };
  });
}

function importedNames(clause: string): string[] {
  if (clause === "side-effect") return [];
  const names = new Set<string>();
  const defaultName = /^([A-Za-z_$][\w$]*)/u.exec(clause)?.[1]; if (defaultName) names.add(defaultName);
  const namespace = /\*\s+as\s+([A-Za-z_$][\w$]*)/u.exec(clause)?.[1]; if (namespace) names.add(namespace);
  const named = /\{([^}]+)\}/u.exec(clause)?.[1];
  if (named) for (const item of named.split(",")) { const name = item.trim().split(/\s+as\s+/u).at(-1)?.trim(); if (name) names.add(name); }
  return [...names];
}

function resolveModule(sourcePath: string, specifier: string, paths: ReadonlySet<string>): string | null {
  const base = posix.normalize(posix.join(posix.dirname(sourcePath), specifier));
  const sourceEquivalent = base.replace(/\.(?:mjs|cjs|js|jsx)$/iu, "");
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mts`, `${base}.cts`, `${sourceEquivalent}.ts`, `${sourceEquivalent}.tsx`, `${sourceEquivalent}.mts`, `${sourceEquivalent}.cts`, `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`, `${base}/index.jsx`];
  return candidates.find((candidate) => paths.has(candidate)) ?? null;
}

function extractPackageJson(reader: SnapshotReader, componentId: string, entry: SnapshotEntry, source: string, facts: Fact[], evidence: Evidence[], diagnostics: Diagnostic[]): void {
  let manifest: Record<string, unknown>;
  try { manifest = JSON.parse(source) as Record<string, unknown>; }
  catch (error) { diagnostics.push(readDiagnostic(reader, entry.relative_path, error)); return; }
  const sections: Array<[string, unknown]> = [["runtime", manifest.dependencies], ["development", manifest.devDependencies], ["peer", manifest.peerDependencies], ["optional", manifest.optionalDependencies]];
  for (const [scope, value] of sections) if (value && typeof value === "object" && !Array.isArray(value)) for (const [name, version] of Object.entries(value as Record<string, unknown>)) {
    const index = Math.max(0, source.indexOf(`"${name}"`));
    addFact(reader, componentId, entry, source, "package_dependency", { package: name, declared_version: String(version), scope, source_path: entry.relative_path }, "package.dependencies", index, index + name.length + 2, facts, evidence);
  }
  if (manifest.scripts && typeof manifest.scripts === "object" && !Array.isArray(manifest.scripts)) for (const [name, command] of Object.entries(manifest.scripts as Record<string, unknown>)) {
    const index = Math.max(0, source.indexOf(`"${name}"`));
    addFact(reader, componentId, entry, source, "build_script", { name, command: String(command), source_path: entry.relative_path }, "package.scripts", index, index + name.length + 2, facts, evidence);
  }
  const runtimeValues: Array<{ technology: string; value: unknown }> = [];
  if (manifest.packageManager) runtimeValues.push({ technology: "package-manager", value: manifest.packageManager });
  if (manifest.engines && typeof manifest.engines === "object") runtimeValues.push({ technology: "runtime", value: manifest.engines });
  if (manifest.type) runtimeValues.push({ technology: "module-system", value: manifest.type });
  for (const value of runtimeValues) addFact(reader, componentId, entry, source, "technology", { ...value, source_path: entry.relative_path }, "package.runtime", 0, 1, facts, evidence);
}

function addFact(reader: SnapshotReader, componentId: string, entry: SnapshotEntry, source: string, kind: string, value: Record<string, unknown>, ruleId: string, characterStart: number, characterEnd: number, facts: Fact[], evidence: Evidence[]): void {
  const start = Buffer.byteLength(source.slice(0, characterStart), "utf8"), end = Buffer.byteLength(source.slice(0, characterEnd), "utf8");
  const evidenceId = stableId("evidence", reader.snapshot.id, entry.relative_path, start, end, ruleId);
  evidence.push({ schema_version: 3, id: evidenceId, repository_id: reader.snapshot.repository_id, snapshot_id: reader.snapshot.id, relative_path: entry.relative_path, source_hash: sha256(source), locator: { kind: "bytes", start, end }, rule_id: ruleId });
  facts.push({ schema_version: 3, id: stableId("fact", componentId, kind, value, evidenceId), kind, component_id: componentId, value, evidence_ids: [evidenceId], rule_id: ruleId });
}

function layer(path: string): string { return path.split("/").find((segment) => ["application", "domain", "infrastructure", "api", "components", "hooks", "navigation", "screens", "services", "store", "tasks", "utils", "workers", "config", "types"].includes(segment)) ?? "root"; }
function role(path: string): string { const normalized = path.toLocaleLowerCase("en-US"); for (const candidate of ["controller", "usecase", "repository", "adapter", "middleware", "validator", "mapper", "dto", "entity", "port", "routes", "service", "services", "util", "utils", "hook", "hooks", "component", "components", "screen", "screens", "navigation", "store", "task", "tasks", "worker", "workers", "config", "types"]) if (normalized.split("/").includes(candidate)) return candidate.replace(/s$/u, ""); return "module"; }
function language(path: string): string { if (/\.tsx$/iu.test(path)) return "tsx"; if (/\.[cm]?ts$/iu.test(path)) return "typescript"; return "javascript"; }
function readDiagnostic(reader: SnapshotReader, path: string, error: unknown): Diagnostic { return { schema_version: 3, id: stableId("diagnostic", reader.snapshot.id, path, "ARCHITECTURE_READ_FAILED"), severity: "error", code: "ARCHITECTURE_READ_FAILED", scope: path, message: error instanceof Error ? error.message : String(error), evidence_ids: [], suggested_action: "Revise el archivo; el resto de la arquitectura se conserva." }; }
function unique<T extends { id: string }>(items: T[]): T[] { return [...new Map(items.map((item) => [item.id, item])).values()].sort((a, b) => compareBytes(a.id, b.id)); }
