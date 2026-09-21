import { extname, basename, dirname } from "node:path";
import { sha256, stableId, compareBytes } from "../platform/hash.js";
const EXCLUDED_SEGMENTS = new Set([".git", "node_modules", "bin", "obj", "target", "dist", "build", "coverage", ".knowledge", ".venv", "venv", "vendor"]);
const BINARY_EXTENSIONS = new Set([".dll", ".exe", ".class", ".jar", ".zip", ".png", ".jpg", ".jpeg", ".gif", ".pdf", ".pdb", ".so", ".dylib", ".woff", ".woff2"]);
const LANGUAGE_BY_EXTENSION = { ".cs": "c_sharp", ".java": "java", ".ts": "typescript", ".tsx": "tsx", ".js": "javascript", ".jsx": "javascript", ".py": "python", ".xml": "xml", ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml" };
const MANIFESTS = new Set(["package.json", "angular.json", "pom.xml", "build.gradle", "build.gradle.kts", "pyproject.toml", "requirements.txt", "web.xml", "weblogic.xml", "application.xml"]);
export async function buildInventory(reader, options = {}) {
    const maxFileBytes = options.maxFileBytes ?? 2 * 1024 * 1024;
    const maxFiles = options.maxFiles ?? 100_000;
    const entries = [...await reader.list()].sort((a, b) => compareBytes(a.relative_path, b.relative_path));
    if (entries.length > maxFiles)
        throw new Error(`El snapshot contiene ${entries.length} entradas; límite ${maxFiles}.`);
    const files = [];
    const diagnostics = [];
    const technologySignals = new Set();
    let excluded = 0, failed = 0, unsupported = 0, processed = 0;
    const exclusionReasons = {};
    for (const entry of entries) {
        const reason = exclusionReason(entry.relative_path, entry.kind, entry.size, maxFileBytes);
        if (reason !== null) {
            excluded += 1;
            exclusionReasons[reason] = (exclusionReasons[reason] ?? 0) + 1;
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
        }
        catch (error) {
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
function exclusionReason(path, kind, size, maxBytes) {
    const segments = path.split("/");
    if (segments.some((segment) => EXCLUDED_SEGMENTS.has(segment)))
        return "excluded_directory";
    if (kind === "submodule")
        return "submodule_not_authorized";
    if (kind === "symlink")
        return "symlink";
    if (size > maxBytes)
        return "size_limit";
    if (BINARY_EXTENSIONS.has(extname(path).toLocaleLowerCase("en-US")))
        return "binary";
    if (/(^|\/)(\.env|id_rsa|id_ed25519|.*\.(pfx|p12|pem|key))$/iu.test(path))
        return "credential_file";
    return null;
}
function classify(path) {
    const name = basename(path);
    if (isManifest(path) || /(?:^|\/)(appsettings[^/]*\.json)$/iu.test(path))
        return "manifest";
    if (/(?:^|\/)(test|tests|spec|specs)(?:\/|$)|(?:\.|_)(?:test|spec)\.[^.]+$/iu.test(path))
        return "test";
    if (/\.(?:md|adoc|rst)$/iu.test(path))
        return "documentation";
    if (LANGUAGE_BY_EXTENSION[extname(path).toLocaleLowerCase("en-US")] !== undefined)
        return "source";
    return "other";
}
function inferTechnologies(path, signals) {
    const name = basename(path).toLocaleLowerCase("en-US");
    if (name === "package.json")
        return ["nodejs", ...(signals.has("angular") ? ["angular"] : []), ...(signals.has("react") ? ["react"] : [])];
    if (name === "pom.xml" || name.startsWith("build.gradle"))
        return ["java", ...(signals.has("spring") ? ["spring"] : [])];
    if (name === "pyproject.toml" || name === "requirements.txt")
        return ["python"];
    if (name.endsWith(".csproj"))
        return ["dotnet"];
    if (["web.xml", "weblogic.xml", "application.xml"].includes(name))
        return ["java-jee"];
    return [];
}
function detectCandidateStacks(repositoryId, files, signals) {
    const byLanguage = new Map();
    for (const file of files)
        if (file.language !== null && file.excluded_reason === null)
            byLanguage.set(file.language, [...(byLanguage.get(file.language) ?? []), file.relative_path]);
    const mappings = [
        ["python", ["python"], byLanguage.has("python")],
        ["dotnet", ["c_sharp", "xml"], signals.has("dotnet")],
        ["java-spring", ["java"], signals.has("spring")],
        ["java-weblogic", ["java", "xml"], signals.has("jee")],
        ["js-angular", ["typescript"], signals.has("angular")],
        ["js-react", ["typescript", "tsx", "javascript"], signals.has("react")],
    ];
    return mappings.flatMap(([plugin, languages, detected]) => {
        if (!detected)
            return [];
        const paths = languages.flatMap((language) => byLanguage.get(language) ?? []);
        return paths.length === 0 ? [] : [{ plugin_id: plugin, component_id: repositoryId, languages, evidence_paths: paths.slice(0, 20) }];
    });
}
function isManifest(path) {
    const name = basename(path).toLocaleLowerCase("en-US");
    return MANIFESTS.has(name) || name.endsWith(".csproj");
}
function collectTechnologySignals(path, source, signals) {
    const name = basename(path).toLocaleLowerCase("en-US");
    const sample = source.slice(0, 512 * 1024).toLocaleLowerCase("en-US");
    if (name.endsWith(".csproj") || /\bmicrosoft\.aspnetcore\b/u.test(sample))
        signals.add("dotnet");
    if (name === "angular.json" || /["']@angular\/core["']/u.test(sample))
        signals.add("angular");
    if (/["'](?:react|react-dom)["']/u.test(sample) || /\bfrom\s+["']react["']/u.test(sample))
        signals.add("react");
    if (/\borg\.springframework\b|\bspring-boot\b/u.test(sample))
        signals.add("spring");
    if (["web.xml", "weblogic.xml", "application.xml"].includes(name) || /\b(?:jakarta|javax)\.(?:ws\.rs|ejb|jms)\b/u.test(sample))
        signals.add("jee");
}
//# sourceMappingURL=inventory.js.map