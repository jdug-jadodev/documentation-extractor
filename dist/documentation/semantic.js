import { resolveEndpointFacts } from "./model.js";
export function semanticFlows(component, facts) {
    return resolveEndpointFacts(facts).filter((endpoint) => endpoint.component === component).map((endpoint) => traceEndpointFlow(endpoint, facts));
}
export function traceEndpointFlow(endpoint, facts, maxDepth = 12, maxSymbols = 80, maxCalls = 160) {
    const symbols = facts.filter((fact) => fact.kind === "code_symbol").map(symbolFromFact).filter((value) => value !== null);
    const symbolById = new Map(symbols.map((symbol) => [symbol.id, symbol]));
    const calls = facts.filter((fact) => fact.kind === "symbol_call").map(callFromFact).filter((value) => value !== null);
    const outgoing = new Map();
    for (const call of calls)
        outgoing.set(call.caller_symbol_id, [...(outgoing.get(call.caller_symbol_id) ?? []), call]);
    const start = resolveHandlerSymbol(endpoint, facts, symbols);
    const reached = [], reachedCalls = [], seen = new Set();
    const queue = start === null ? [] : [{ id: start.id, depth: 0 }];
    while (queue.length > 0 && reached.length < maxSymbols) {
        const current = queue.shift();
        if (seen.has(current.id))
            continue;
        seen.add(current.id);
        const symbol = symbolById.get(current.id);
        if (symbol === undefined)
            continue;
        reached.push(symbol);
        if (current.depth >= maxDepth)
            continue;
        for (const call of outgoing.get(current.id) ?? []) {
            if (reachedCalls.length < maxCalls)
                reachedCalls.push(call);
            if (call.target_symbol_id !== null && !seen.has(call.target_symbol_id))
                queue.push({ id: call.target_symbol_id, depth: current.depth + 1 });
        }
    }
    const reachedPaths = new Set([endpoint.source_path, ...reached.map((symbol) => symbol.source_path)]);
    const data = facts.filter((fact) => ["data_read", "data_write", "data_entity", "data_resource"].includes(fact.kind)).map((fact) => {
        const value = asRecord(fact.value), sourcePath = String(value.source_path ?? "");
        return { kind: fact.kind, entity: String(value.entity ?? value.table ?? value.resource ?? value.name ?? "dato no nombrado"), operation: String(value.operation ?? operationFor(fact.kind)), source_path: sourcePath, evidence_ids: fact.evidence_ids };
    }).filter((item) => reachedPaths.has(item.source_path));
    const integrations = facts.filter((fact) => fact.kind === "http_client_call").map((fact) => {
        const value = asRecord(fact.value);
        return { method: String(value.method ?? "UNKNOWN"), target: String(value.path_expression ?? value.base_url ?? value.target ?? "destino no resuelto"), source_path: String(value.source_path ?? ""), evidence_ids: fact.evidence_ids };
    }).filter((item) => reachedPaths.has(item.source_path));
    const unresolved = reachedCalls.filter((call) => call.resolution !== "supported").length;
    const limitations = [];
    if (start === null)
        limitations.push(`No se pudo enlazar el handler «${endpoint.handler}» con un símbolo AST.`);
    if (unresolved > 0)
        limitations.push(`${unresolved} llamada(s) del flujo conservan resolución candidata o no resuelta.`);
    if (reached.length >= maxSymbols)
        limitations.push(`El flujo se limitó a ${maxSymbols} símbolos para mantener una respuesta compacta.`);
    if (reachedCalls.length >= maxCalls)
        limitations.push(`La respuesta se limitó a ${maxCalls} llamadas para mantener el contexto compacto.`);
    return { endpoint, start_symbol_id: start?.id ?? null, symbols: reached, calls: reachedCalls, data, integrations, limitations };
}
export function explainServiceFromFacts(runId, component, facts, graph, symbolLimit = 80) {
    const selected = facts.filter((fact) => fact.component_id === component || fact.component_id.startsWith(`${component}:`));
    const symbols = selected.filter((fact) => fact.kind === "code_symbol").map(symbolFromFact).filter((value) => value !== null);
    const endpoints = resolveEndpointFacts(selected);
    const technologies = selected.filter((fact) => fact.kind === "technology" || fact.kind === "package_dependency").map((fact) => {
        const value = asRecord(fact.value);
        return String(value.package ?? value.technology ?? value.name ?? value.value ?? "");
    }).filter(Boolean);
    const relations = graph.edges.filter((edge) => edge.from === `component:${component}` || edge.to === `component:${component}`).map((edge) => ({ direction: edge.from === `component:${component}` ? "outgoing" : "incoming", type: edge.type, from: edge.from, to: edge.to, status: edge.status, limitations: edge.limitations }));
    const allClasses = [...new Set(symbols.map((symbol) => symbol.class_name ?? (symbol.symbol_type === "class" ? symbol.name : null)).filter((value) => value !== null))];
    let remaining = symbolLimit;
    const classes = [];
    for (const name of allClasses) {
        if (remaining <= 0)
            break;
        const methods = symbols.filter((symbol) => symbol.class_name === name).slice(0, remaining).map((symbol) => ({ name: symbol.name, signature: symbol.signature, description: symbol.description, source_path: symbol.source_path, start_line: symbol.start_line }));
        classes.push({ name, methods });
        remaining -= Math.max(1, methods.length);
    }
    const standalone = symbols.filter((symbol) => symbol.class_name === null && symbol.symbol_type !== "class").slice(0, Math.max(0, remaining));
    return {
        schema_version: 3, run_id: runId, component,
        summary: { endpoints: endpoints.length, classes: classes.length, symbols: symbols.length, relations: relations.length },
        technologies: [...new Set(technologies)].sort(),
        endpoints: endpoints.map((endpoint) => ({ method: endpoint.method, path: endpoint.path, handler: endpoint.handler, source_path: endpoint.source_path, status: endpoint.status })),
        relations,
        classes,
        standalone_symbols: standalone.map(compactSymbol),
        truncated: allClasses.length > classes.length || symbols.length > symbolLimit
    };
}
export function explainEndpointFromFacts(runId, component, method, path, facts) {
    const selected = facts.filter((fact) => fact.component_id === component || fact.component_id.startsWith(`${component}:`));
    const endpoint = resolveEndpointFacts(selected).find((item) => item.method.toUpperCase() === method.toUpperCase() && normalizePath(item.path) === normalizePath(path));
    if (endpoint === undefined)
        return { schema_version: 3, run_id: runId, component, method: method.toUpperCase(), path, status: "unresolved", limitations: ["No existe un endpoint extraído que coincida exactamente con método y ruta."] };
    const flow = traceEndpointFlow(endpoint, selected);
    return { schema_version: 3, run_id: runId, component, status: flow.start_symbol_id === null ? "partial" : flow.limitations.length === 0 ? "supported" : "partial", endpoint: flow.endpoint, steps: flow.symbols.map(compactSymbol), calls: flow.calls, data: flow.data, integrations: flow.integrations, limitations: flow.limitations };
}
function resolveHandlerSymbol(endpoint, facts, symbols) {
    const handler = endpoint.handler.replace(/\s+/gu, " ").trim();
    const dotted = [...handler.matchAll(/([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)+)(?=\s*\()/gu)].map((match) => match[1].replace(/\s+/gu, ""));
    const reference = dotted.at(-1) ?? handler.split(",").at(-1).trim().replace(/\([^)]*\)$/u, "").replace(/^(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*/u, "");
    const parts = reference.split(/[.?]/u).filter(Boolean), method = parts.at(-1) ?? reference, receiver = parts.length > 1 ? parts.at(-2) ?? null : null;
    const constructions = facts.filter((fact) => fact.kind === "object_construction").map((fact) => asRecord(fact.value));
    const receiverType = receiver === null ? null : constructions.find((value) => String(value.variable ?? "").replace(/^this\./u, "") === receiver.replace(/^this\./u, ""))?.constructed_type;
    const exact = symbols.filter((symbol) => symbol.name === method && (receiverType === undefined || symbol.class_name === simpleType(String(receiverType))));
    if (exact.length === 1)
        return exact[0];
    const sameFile = exact.find((symbol) => symbol.source_path === endpoint.source_path) ?? symbols.find((symbol) => symbol.name === method && symbol.source_path === endpoint.source_path);
    return sameFile ?? exact[0] ?? null;
}
function symbolFromFact(fact) {
    const value = asRecord(fact.value), id = String(value.symbol_id ?? ""), name = String(value.name ?? "");
    if (id === "" || name === "")
        return null;
    return { id, name, class_name: typeof value.class_name === "string" ? value.class_name : null, symbol_type: String(value.symbol_type ?? "symbol"), signature: String(value.signature ?? name), description: String(value.description ?? "Descripción no disponible."), source_path: String(value.source_path ?? ""), start_line: typeof value.start_line === "number" ? value.start_line : null, end_line: typeof value.end_line === "number" ? value.end_line : null, snippet: String(value.snippet ?? "") };
}
function callFromFact(fact) {
    const value = asRecord(fact.value), caller = String(value.caller_symbol_id ?? "");
    if (caller === "")
        return null;
    return { caller_symbol_id: caller, target_symbol_id: typeof value.target_symbol_id === "string" ? value.target_symbol_id : null, callee_name: String(value.callee_name ?? ""), receiver: typeof value.receiver === "string" ? value.receiver : null, expression: String(value.expression ?? value.callee_name ?? ""), resolution: String(value.resolution ?? "unresolved") };
}
function compactSymbol(symbol) { return { id: symbol.id, class_name: symbol.class_name, name: symbol.name, type: symbol.symbol_type, signature: symbol.signature, description: symbol.description, source_path: symbol.source_path, start_line: symbol.start_line }; }
function operationFor(kind) { return kind === "data_read" ? "read" : kind === "data_write" ? "write" : "reference"; }
function normalizePath(value) { const normalized = value.trim().replace(/\/+$/u, ""); return normalized === "" ? "/" : normalized; }
function simpleType(value) { return value.replace(/<.*>/gu, "").replace(/\[\]$/u, "").split(/[.$]/u).at(-1)?.trim() ?? value; }
function asRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {}; }
//# sourceMappingURL=semantic.js.map