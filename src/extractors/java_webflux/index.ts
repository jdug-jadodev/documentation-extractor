import type { CandidateStack, CapabilityCoverage, Diagnostic, Evidence, ExtractionOptions, ExtractionResult, ExtractorPlugin, Fact, Inventory, SnapshotEntry, SnapshotReader } from "../../contracts/types.js";
import { compareBytes, sha256, stableId } from "../../platform/hash.js";

const JAVA = /\.java$/iu;
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

export class JavaWebFluxPlugin implements ExtractorPlugin {
  readonly id = "java-webflux";
  readonly version = "1.0.0";
  readonly supported_languages = ["java"] as const;
  readonly capabilities = { functional_routes: "implemented", reactive_pipelines: "partial", webclient: "partial" } as const;
  readonly rule_versions = { "webflux.functional-route": "1", "webflux.reactive-pipeline": "1", "webflux.webclient": "1" } as const;

  async detect(inventory: Inventory): Promise<CandidateStack[]> { return inventory.candidate_stacks.filter((item) => item.plugin_id === this.id); }

  async extract(reader: SnapshotReader, component: CandidateStack, options: ExtractionOptions): Promise<ExtractionResult> {
    const entries = [...await reader.list()].filter((entry) => entry.kind === "blob" && JAVA.test(entry.relative_path) && !isTestPath(entry.relative_path) && (options.include_paths === undefined || options.include_paths.has(entry.relative_path))).sort((a, b) => compareBytes(a.relative_path, b.relative_path));
    const facts: Fact[] = [], evidence: Evidence[] = [], diagnostics: Diagnostic[] = [];
    let routes = 0, pipelines = 0, clients = 0, failed = 0;
    for (const entry of entries) {
      if (entry.size > options.max_file_bytes) continue;
      let source: string;
      try { source = Buffer.from(await reader.read(entry.relative_path, { maxBytes: options.max_file_bytes, ...(options.signal === undefined ? {} : { signal: options.signal }) })).toString("utf8"); }
      catch (error) { failed += 1; diagnostics.push(readDiagnostic(reader, entry.relative_path, error)); continue; }
      const extractedRoutes = functionalRoutes(source);
      for (let routeIndex = 0; routeIndex < extractedRoutes.length; routeIndex += 1) { const item = extractedRoutes[routeIndex]!; routes += 1; addFact(reader, component.component_id, entry, source, "http_endpoint", { ...item.value, route_order: routeIndex + 1 }, "webflux.functional-route", item.start, item.end, facts, evidence); }
      for (const item of reactivePipelines(source)) { pipelines += 1; addFact(reader, component.component_id, entry, source, "reactive_pipeline", { ...item.value, source_path: entry.relative_path }, "webflux.reactive-pipeline", item.start, item.end, facts, evidence); }
      for (const item of webClients(source)) { clients += 1; addFact(reader, component.component_id, entry, source, "http_client_call", { ...item.value, source_path: entry.relative_path }, "webflux.webclient", item.start, item.end, facts, evidence); }
    }
    const coverage_by_capability: CapabilityCoverage[] = [
      { capability: "functional_routes", status: "implemented", processed: routes, failed, limitations: [] },
      { capability: "reactive_pipelines", status: "partial", processed: pipelines, failed, limitations: ["Los operadores se obtienen de la cadena estática; el comportamiento en tiempo de ejecución no se infiere."] },
      { capability: "webclient", status: "partial", processed: clients, failed, limitations: ["Las URI construidas dinámicamente se conservan como expresión."] }
    ];
    return { plugin_id: this.id, plugin_version: this.version, facts: unique(facts), evidence: unique(evidence), diagnostics, coverage_by_capability, dependencies: entries.map((entry) => entry.relative_path) };
  }
}

export function createJavaWebFluxPlugin(): ExtractorPlugin { return new JavaWebFluxPlugin(); }

interface LocatedValue { start: number; end: number; value: Record<string, unknown>; }
interface Scope { start: number; end: number; path: string; }

function functionalRoutes(source: string): LocatedValue[] {
  const constants = stringConstants(source);
  const variables = declaredTypes(source);
  const routerClass = /\bclass\s+([A-Za-z_$][\w$]*)/u.exec(source)?.[1] ?? "Router";
  const scopes = routeScopes(source, constants);
  const result: LocatedValue[] = [];
  const seen = new Set<number>();
  for (const match of source.matchAll(/\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/gu)) {
    const start = match.index ?? 0;
    const open = start + match[0].lastIndexOf("(");
    const close = matchingDelimiter(source, open, "(", ")");
    if (close === null) continue;
    const args = splitTopLevel(source.slice(open + 1, close));
    const handler = args.map((item) => methodReference(item)).find((item) => item !== null);
    if (handler === undefined) continue;
    const localPath = resolveString(args[0] ?? "", constants);
    result.push(routeValue(source, start, close + 1, match[1] ?? "UNKNOWN", localPath, handler, variables, routerClass, scopes));
    seen.add(start);
  }
  for (const match of source.matchAll(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/gu)) {
    const predicateStart = match.index ?? 0;
    if (predicateStart > 0 && source[predicateStart - 1] === ".") continue;
    const predicateOpen = predicateStart + match[0].lastIndexOf("(");
    const predicateClose = matchingDelimiter(source, predicateOpen, "(", ")");
    if (predicateClose === null) continue;
    const routePrefix = source.slice(Math.max(0, predicateStart - 60), predicateStart);
    if (!/\broute\s*\([^)]*$/u.test(routePrefix) && !/RouterFunctions\.route\s*\([^)]*$/u.test(routePrefix)) continue;
    const routeOpen = source.lastIndexOf("(", predicateStart);
    const routeClose = matchingDelimiter(source, routeOpen, "(", ")");
    if (routeOpen < 0 || routeClose === null) continue;
    const args = splitTopLevel(source.slice(routeOpen + 1, routeClose));
    const handler = args.map((item) => methodReference(item)).find((item) => item !== null);
    if (handler === undefined || seen.has(predicateStart)) continue;
    result.push(routeValue(source, predicateStart, routeClose + 1, match[1] ?? "UNKNOWN", resolveString(source.slice(predicateOpen + 1, predicateClose), constants), handler, variables, routerClass, scopes));
  }
  return result;
}

function routeValue(source: string, start: number, end: number, httpMethod: string, localPath: string, handler: { receiver: string; method: string; expression?: string }, variables: ReadonlyMap<string, string>, routerClass: string, scopes: readonly Scope[]): LocatedValue {
  const scope = scopes.filter((item) => item.start < start && item.end >= end).sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];
  const handlerClass = variables.get(handler.receiver) ?? null;
  const expression = source.slice(start, end);
  return { start, end, value: {
    framework: "spring-webflux-functional", method: httpMethod, path: joinPaths(scope?.path ?? "", localPath), route_scope: scope === undefined ? "router" : "nested-router",
    handler_expression: handler.expression ?? `${handlerClass ?? handler.receiver}.${handler.method}`, handler_receiver: handler.receiver, handler_class: handlerClass, handler_method: handler.method,
    router_class: routerClass, reactive: true, predicates: predicateNames(expression), filters: nearbyFilters(source, start, end), source_path: null
  } };
}

function routeScopes(source: string, constants: ReadonlyMap<string, string>): Scope[] {
  const result: Scope[] = [];
  for (const match of source.matchAll(/\.path\s*\(\s*([^,]+),/gu)) {
    const open = (match.index ?? 0) + match[0].indexOf("(");
    const close = matchingDelimiter(source, open, "(", ")");
    if (close !== null) result.push({ start: match.index ?? 0, end: close + 1, path: resolveString(match[1] ?? "", constants) });
  }
  for (const match of source.matchAll(/RouterFunctions\.nest\s*\(\s*RequestPredicates\.path\s*\(([^)]+)\)/gu)) {
    const open = (match.index ?? 0) + match[0].indexOf("(");
    const close = matchingDelimiter(source, open, "(", ")");
    if (close !== null) result.push({ start: match.index ?? 0, end: close + 1, path: resolveString(match[1] ?? "", constants) });
  }
  return result;
}

function reactivePipelines(source: string): LocatedValue[] {
  const result: LocatedValue[] = [];
  const methodPattern = /\b(?:public|protected|private)?\s*(?:static\s+)?(Mono|Flux)\s*<([^>]+)>\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gu;
  for (const match of source.matchAll(methodPattern)) {
    const open = (match.index ?? 0) + match[0].lastIndexOf("{");
    const close = matchingDelimiter(source, open, "{", "}");
    if (close === null) continue;
    const body = source.slice(open + 1, close);
    const operators = [...new Set([...body.matchAll(/\.(map|flatMap|flatMapMany|filter|switchIfEmpty|defaultIfEmpty|zip|zipWith|zipWhen|when|then|thenReturn|onErrorResume|onErrorMap|doOnNext|doOnError|publishOn|subscribeOn|delayElement|parallel|runOn|sequential|collectList|concatMap|mergeWith|timeout|retry)\s*\(/gu)].map((item) => item[1] ?? ""))];
    const risks = /\.subscribe\s*\(/u.test(body) ? ["suscripción manual dentro del código de aplicación"] : [];
    result.push({ start: match.index ?? 0, end: close + 1, value: { class_name: enclosingClass(source, match.index ?? 0), symbol_name: match[3] ?? "unknown", container: match[1] ?? "unknown", payload: (match[2] ?? "unknown").trim(), cardinality: match[1] === "Flux" ? "many" : "zero-or-one", operators, empty_strategy: operators.find((value) => value === "switchIfEmpty" || value === "defaultIfEmpty") ?? null, error_strategy: operators.filter((value) => value.startsWith("onError") || value === "retry" || value === "timeout"), concurrency: operators.filter((value) => ["publishOn", "subscribeOn", "parallel", "runOn", "sequential"].includes(value)), body_input: /bodyToMono\s*\(/u.test(body) ? "Mono" : /bodyToFlux\s*\(/u.test(body) ? "Flux" : null, sse: /ServerSentEvent|TEXT_EVENT_STREAM/u.test(body), risks } });
  }
  return result;
}

function webClients(source: string): LocatedValue[] {
  const result: LocatedValue[] = [];
  for (const match of source.matchAll(/\.(get|post|put|patch|delete)\s*\(\s*\)\s*\.uri\s*\(([^)]*)\)/giu)) result.push({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length, value: { library: "webclient", method: (match[1] ?? "UNKNOWN").toLocaleUpperCase("en-US"), uri_expression: (match[2] ?? "").trim(), reactive: true } });
  for (const match of source.matchAll(/\.method\s*\(\s*HttpMethod\.([A-Z]+)\s*\)\s*\.uri\s*\(([^)]*)\)/gu)) result.push({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length, value: { library: "webclient", method: match[1] ?? "UNKNOWN", uri_expression: (match[2] ?? "").trim(), reactive: true } });
  return result;
}

function declaredTypes(source: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const match of source.matchAll(/\b([A-Z][A-Za-z0-9_$]*(?:\s*<[^;=(){}]+>)?)\s+([a-z_$][\w$]*)\b/gu)) result.set(match[2] ?? "", simpleType(match[1] ?? ""));
  return result;
}

function stringConstants(source: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const match of source.matchAll(/\b(?:static\s+)?final\s+String\s+([A-Z_$][\w$]*)\s*=\s*([^;]+);/gu)) result.set(match[1] ?? "", resolveString(match[2] ?? "", result));
  return result;
}

function resolveString(expression: string, constants: ReadonlyMap<string, string>): string {
  const parts = splitTopLevel(expression, "+");
  const resolved = parts.map((part) => { const value = part.trim(); const quoted = /^(?:"([^"]*)"|'([^']*)')$/u.exec(value); if (quoted) return quoted[1] ?? quoted[2] ?? ""; return constants.get(value) ?? `{${value.replace(/\s+/gu, " ")}}`; });
  return resolved.join("") || "/";
}

function methodReference(value: string): { receiver: string; method: string; expression?: string } | null { const match = /\b([A-Za-z_$][\w$]*)\s*::\s*([A-Za-z_$][\w$]*)\b/u.exec(value); if (match) return { receiver: match[1] ?? "handler", method: match[2] ?? "unknown" }; if (/->/u.test(value)) return { receiver: "inline", method: "lambda", expression: value.replace(/\s+/gu, " ").trim().slice(0, 240) }; return null; }
function predicateNames(value: string): string[] { return [...new Set([...value.matchAll(/\b(?:RequestPredicates\.)?(accept|contentType|headers?|queryParam)\s*\(/giu)].map((match) => match[1]?.toLocaleLowerCase("en-US") ?? "predicate"))]; }
function nearbyFilters(source: string, start: number, end: number): string[] { const sample = source.slice(start, Math.min(source.length, end + 500)); return [...new Set([...sample.matchAll(/\.filter\s*\(\s*([A-Za-z_$][\w$]*(?:::[A-Za-z_$][\w$]*)?)/gu)].map((match) => match[1] ?? "filter"))]; }
function enclosingClass(source: string, position: number): string | null { return [...source.slice(0, position).matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/gu)].at(-1)?.[1] ?? null; }
function simpleType(value: string): string { return value.replace(/<.*>/gu, "").split(/[.$]/u).at(-1)?.trim() ?? value; }
function joinPaths(prefix: string, path: string): string { const joined = `${prefix}/${path}`.replace(/\/+/gu, "/"); const rooted = joined.startsWith("/") ? joined : `/${joined}`; return rooted.length > 1 ? rooted.replace(/\/$/u, "") : rooted; }
function isTestPath(path: string): boolean { return /(^|\/)src\/test\/|(^|\/)(?:test|tests|spec|specs)(\/|$)|(?:Test|Tests|Spec)\.java$/u.test(path); }

function splitTopLevel(value: string, delimiter = ","): string[] {
  const result: string[] = []; let start = 0, round = 0, square = 0, curly = 0, quote: string | null = null, escaped = false;
  for (let index = 0; index < value.length; index += 1) { const char = value[index]!; if (quote !== null) { if (escaped) escaped = false; else if (char === "\\") escaped = true; else if (char === quote) quote = null; continue; } if (["\"", "'", "`"].includes(char)) { quote = char; continue; } if (char === "(") round += 1; else if (char === ")") round -= 1; else if (char === "[") square += 1; else if (char === "]") square -= 1; else if (char === "{") curly += 1; else if (char === "}") curly -= 1; else if (char === delimiter && round === 0 && square === 0 && curly === 0) { result.push(value.slice(start, index)); start = index + 1; } }
  result.push(value.slice(start)); return result;
}

function matchingDelimiter(source: string, open: number, left: string, right: string): number | null {
  if (source[open] !== left) return null; let depth = 0, quote: string | null = null, escaped = false, lineComment = false, blockComment = false;
  for (let index = open; index < source.length; index += 1) { const char = source[index]!, next = source[index + 1] ?? ""; if (lineComment) { if (char === "\n") lineComment = false; continue; } if (blockComment) { if (char === "*" && next === "/") { blockComment = false; index += 1; } continue; } if (quote !== null) { if (escaped) escaped = false; else if (char === "\\") escaped = true; else if (char === quote) quote = null; continue; } if (char === "/" && next === "/") { lineComment = true; index += 1; continue; } if (char === "/" && next === "*") { blockComment = true; index += 1; continue; } if (["\"", "'", "`"].includes(char)) { quote = char; continue; } if (char === left) depth += 1; else if (char === right && --depth === 0) return index; }
  return null;
}

function addFact(reader: SnapshotReader, componentId: string, entry: SnapshotEntry, source: string, kind: string, rawValue: Record<string, unknown>, ruleId: string, characterStart: number, characterEnd: number, facts: Fact[], evidence: Evidence[]): void {
  const value = rawValue.source_path === null ? { ...rawValue, source_path: entry.relative_path } : rawValue;
  const start = Buffer.byteLength(source.slice(0, characterStart), "utf8"), end = Buffer.byteLength(source.slice(0, characterEnd), "utf8");
  const evidenceId = stableId("evidence", reader.snapshot.id, entry.relative_path, start, end, ruleId);
  evidence.push({ schema_version: 3, id: evidenceId, repository_id: reader.snapshot.repository_id, snapshot_id: reader.snapshot.id, relative_path: entry.relative_path, source_hash: sha256(source), locator: { kind: "bytes", start, end }, rule_id: ruleId });
  facts.push({ schema_version: 3, id: stableId("fact", componentId, kind, value, evidenceId), kind, component_id: componentId, value, evidence_ids: [evidenceId], rule_id: ruleId });
}

function readDiagnostic(reader: SnapshotReader, path: string, error: unknown): Diagnostic { return { schema_version: 3, id: stableId("diagnostic", reader.snapshot.id, path, "WEBFLUX_READ_FAILED"), severity: "error", code: "WEBFLUX_READ_FAILED", scope: path, message: error instanceof Error ? error.message : String(error), evidence_ids: [], suggested_action: "Revise el archivo afectado; las demás rutas se conservan." }; }
function unique<T extends { id: string }>(items: T[]): T[] { return [...new Map(items.map((item) => [item.id, item])).values()].sort((a, b) => compareBytes(a.id, b.id)); }
