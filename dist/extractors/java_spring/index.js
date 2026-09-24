import { compareBytes, sha256, stableId } from "../../platform/hash.js";
import { PatternExtractorPlugin, pathValue } from "../base.js";
const supportingPlugin = new PatternExtractorPlugin({
    id: "java-spring", version: "2.0.0", languages: ["java", "xml"],
    capabilities: { feign_clients: "partial", persistence: "partial", messaging: "partial", manifests: "implemented" },
    rules: [
        { id: "spring.feign.client", version: "1", capability: "feign_clients", languages: ["java"], file: /\.java$/iu, pattern: /@FeignClient\s*\([^)]*?(?:url\s*=\s*)?(["'][^"']+["'])/giu, factKind: "http_client_base", map: (match) => ({ library: "feign", base_url: pathValue(match[1]), resolved: !/\$\{/u.test(match[1] ?? "") }) },
        { id: "spring.jpa.entity", version: "1", capability: "persistence", languages: ["java"], file: /\.java$/iu, pattern: /@Entity\b[\s\S]{0,500}?\bclass\s+([A-Za-z_]\w*)/giu, factKind: "data_entity", map: (match) => ({ orm: "jpa", entity: match[1] ?? null, operations: "unknown" }) },
        { id: "spring.kafka.listener", version: "1", capability: "messaging", languages: ["java"], file: /\.java$/iu, pattern: /@KafkaListener\s*\([^)]*?topics\s*=\s*(["'][^"']+["'])/giu, factKind: "message_consumer", map: (match) => ({ broker: "kafka", topic: pathValue(match[1]), environment: null }) },
        { id: "spring.pom.dependency", version: "1", capability: "manifests", languages: ["xml"], file: /pom\.xml$/iu, pattern: /<dependency>[\s\S]*?<groupId>([^<]+)<\/groupId>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?<\/dependency>/giu, factKind: "package_dependency", map: (match) => ({ package: `${match[1]?.trim() ?? "unknown"}:${match[2]?.trim() ?? "unknown"}`, declared: true }) }
    ]
});
export class JavaSpringPlugin {
    id = "java-spring";
    version = "2.0.0";
    supported_languages = ["java", "xml"];
    capabilities = { http_endpoints: "implemented", ...supportingPlugin.capabilities };
    rule_versions = { "spring.annotated-endpoint": "2", ...supportingPlugin.rule_versions };
    async detect(inventory) { return inventory.candidate_stacks.filter((item) => item.plugin_id === this.id); }
    async extract(reader, component, options) {
        const supporting = await supportingPlugin.extract(reader, component, options);
        const facts = [...supporting.facts], evidence = [...supporting.evidence], diagnostics = [...supporting.diagnostics];
        const entries = [...await reader.list()].filter((entry) => entry.kind === "blob" && /\.java$/iu.test(entry.relative_path) && !isTestPath(entry.relative_path) && (options.include_paths === undefined || options.include_paths.has(entry.relative_path))).sort((a, b) => compareBytes(a.relative_path, b.relative_path));
        let processed = 0, failed = 0;
        for (const entry of entries) {
            if (entry.size > options.max_file_bytes)
                continue;
            let source;
            try {
                source = Buffer.from(await reader.read(entry.relative_path, { maxBytes: options.max_file_bytes, ...(options.signal === undefined ? {} : { signal: options.signal }) })).toString("utf8");
            }
            catch (error) {
                failed += 1;
                diagnostics.push(readDiagnostic(reader, entry.relative_path, error));
                continue;
            }
            for (const endpoint of annotatedEndpoints(source)) {
                processed += 1;
                addFact(reader, component.component_id, entry, source, endpoint.value, endpoint.start, endpoint.end, facts, evidence);
            }
        }
        const coverage_by_capability = [{ capability: "http_endpoints", status: "implemented", processed, failed, limitations: ["Las expresiones de ruta no resolubles se conservan entre llaves."] }, ...supporting.coverage_by_capability];
        return { plugin_id: this.id, plugin_version: this.version, facts: unique(facts), evidence: unique(evidence), diagnostics: unique(diagnostics), coverage_by_capability, dependencies: [...new Set([...supporting.dependencies, ...entries.map((entry) => entry.relative_path)])].sort(compareBytes) };
    }
}
export function createJavaSpringPlugin() { return new JavaSpringPlugin(); }
function annotatedEndpoints(source) {
    const constants = stringConstants(source);
    const classMappings = classRoutePrefixes(source, constants);
    const result = [];
    const annotation = /@(GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping|RequestMapping)\b\s*(?:\(([^)]*)\))?/gu;
    for (const match of source.matchAll(annotation)) {
        const start = match.index ?? 0, after = start + match[0].length;
        const tail = source.slice(after, Math.min(source.length, after + 1600));
        const method = /^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n|@[A-Za-z_$][\w$.]*(?:\([^\r\n]*\))?)*\s*(?:(?:public|protected|private|static|final|synchronized|abstract|default)\s+)*([A-Za-z_$][\w$.,<>?\[\]\s]*)\s+([A-Za-z_$][\w$]*)\s*\(/u.exec(tail);
        if (method === null)
            continue;
        const between = tail.slice(0, method.index + method[0].indexOf(method[1] ?? ""));
        if (/\b(?:class|interface|record|enum)\s+[A-Za-z_$]/u.test(between))
            continue;
        const headerStart = after + (method.index ?? 0), parameterOpen = headerStart + method[0].lastIndexOf("("), parameterClose = matchingDelimiter(source, parameterOpen, "(", ")");
        if (parameterClose === null)
            continue;
        const bodyOpen = source.indexOf("{", parameterClose + 1);
        if (bodyOpen < 0 || /[;=]/u.test(source.slice(parameterClose + 1, bodyOpen)))
            continue;
        const end = bodyOpen + 1;
        const classInfo = enclosingClass(source, start);
        if (classInfo === null)
            continue;
        const annotationName = match[1] ?? "RequestMapping", args = match[2] ?? "";
        const httpMethod = annotationName === "RequestMapping" ? /\bRequestMethod\.([A-Z]+)/u.exec(args)?.[1] ?? "ANY" : annotationName.replace("Mapping", "").toLocaleUpperCase("en-US");
        const paths = annotationPaths(args, constants);
        const returnType = (method[1] ?? "unknown").replace(/\s+/gu, " ").trim();
        for (const path of paths)
            result.push({ start, end, value: { framework: "spring-annotated", method: httpMethod, path: joinPaths(classMappings.get(classInfo.name) ?? "", path), route_scope: "method", handler_expression: `${classInfo.name}.${method[2] ?? "unknown"}`, handler_class: classInfo.name, handler_method: method[2] ?? "unknown", return_type: returnType, reactive: /\b(?:Mono|Flux)\s*</u.test(returnType), source_path: null } });
    }
    return result;
}
function matchingDelimiter(source, open, left, right) {
    if (source[open] !== left)
        return null;
    let depth = 0, quote = null, escaped = false;
    for (let index = open; index < source.length; index += 1) {
        const char = source[index];
        if (quote !== null) {
            if (escaped)
                escaped = false;
            else if (char === "\\")
                escaped = true;
            else if (char === quote)
                quote = null;
            continue;
        }
        if (char === "\"" || char === "'") {
            quote = char;
            continue;
        }
        if (char === left)
            depth += 1;
        else if (char === right && --depth === 0)
            return index;
    }
    return null;
}
function classRoutePrefixes(source, constants) {
    const result = new Map();
    for (const match of source.matchAll(/@RequestMapping\s*(?:\(([^)]*)\))?[\s\r\n]*(?:(?:public|abstract|final)\s+)*class\s+([A-Za-z_$][\w$]*)/gu))
        result.set(match[2] ?? "unknown", annotationPaths(match[1] ?? "", constants)[0] ?? "/");
    return result;
}
function annotationPaths(args, constants) {
    const selected = /\b(?:value|path)\s*=\s*(\{[^}]*\}|[^,]+)/u.exec(args)?.[1] ?? args.split(",")[0] ?? "";
    const expressions = selected.trim().startsWith("{") ? selected.replace(/^\{|\}$/gu, "").split(",") : [selected];
    const paths = expressions.map((value) => resolveString(value.trim(), constants)).filter((value) => value !== "");
    return paths.length > 0 ? paths : ["/"];
}
function stringConstants(source) { const result = new Map(); for (const match of source.matchAll(/\b(?:static\s+)?final\s+String\s+([A-Z_$][\w$]*)\s*=\s*([^;]+);/gu))
    result.set(match[1] ?? "", resolveString(match[2] ?? "", result)); return result; }
function resolveString(expression, constants) { const value = expression.trim(); if (value === "")
    return ""; return value.split("+").map((part) => { const item = part.trim(); const quoted = /^(?:"([^"]*)"|'([^']*)')$/u.exec(item); return quoted ? quoted[1] ?? quoted[2] ?? "" : constants.get(item) ?? `{${item}}`; }).join(""); }
function joinPaths(prefix, path) { const joined = `${prefix}/${path}`.replace(/\/+/gu, "/"); const rooted = joined.startsWith("/") ? joined : `/${joined}`; return rooted.length > 1 ? rooted.replace(/\/$/u, "") : rooted; }
function enclosingClass(source, position) { const match = [...source.slice(0, position).matchAll(/\b(?:class|interface|record)\s+([A-Za-z_$][\w$]*)/gu)].at(-1); return match ? { name: match[1] ?? "unknown", index: match.index ?? 0 } : null; }
function isTestPath(path) { return /(^|\/)src\/test\/|(^|\/)(?:test|tests|spec|specs)(\/|$)|(?:Test|Tests|Spec)\.java$/u.test(path); }
function addFact(reader, componentId, entry, source, rawValue, characterStart, characterEnd, facts, evidence) {
    const value = rawValue.source_path === null ? { ...rawValue, source_path: entry.relative_path } : rawValue;
    const start = Buffer.byteLength(source.slice(0, characterStart), "utf8"), end = Buffer.byteLength(source.slice(0, characterEnd), "utf8"), ruleId = "spring.annotated-endpoint";
    const evidenceId = stableId("evidence", reader.snapshot.id, entry.relative_path, start, end, ruleId);
    evidence.push({ schema_version: 3, id: evidenceId, repository_id: reader.snapshot.repository_id, snapshot_id: reader.snapshot.id, relative_path: entry.relative_path, source_hash: sha256(source), locator: { kind: "bytes", start, end }, rule_id: ruleId });
    facts.push({ schema_version: 3, id: stableId("fact", componentId, "http_endpoint", value, evidenceId), kind: "http_endpoint", component_id: componentId, value, evidence_ids: [evidenceId], rule_id: ruleId });
}
function readDiagnostic(reader, path, error) { return { schema_version: 3, id: stableId("diagnostic", reader.snapshot.id, path, "SPRING_READ_FAILED"), severity: "error", code: "SPRING_READ_FAILED", scope: path, message: error instanceof Error ? error.message : String(error), evidence_ids: [], suggested_action: "Revise el archivo afectado; los demás endpoints se conservan." }; }
function unique(items) { return [...new Map(items.map((item) => [item.id, item])).values()].sort((a, b) => compareBytes(a.id, b.id)); }
//# sourceMappingURL=index.js.map