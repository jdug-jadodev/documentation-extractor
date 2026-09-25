import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { atomicWrite } from "../platform/fs.js";
import { stableId } from "../platform/hash.js";
import { loadDocumentationIntelligence } from "./index.js";
const DEFAULT_BUDGET = { max_context_tokens: 15_000, max_documents: 40, max_flows: 5, max_symbols: 25, max_documents_per_repository: 15 };
export async function searchDocumentation(runRoot, query, options = {}) {
    const index = await loadDocumentationIntelligence(runRoot);
    const terms = queryTokens(query), exact = normalize(query);
    const scored = index.chunks.filter((chunk) => options.repository === undefined || chunk.repository_id === options.repository).map((chunk) => {
        const metadata = normalize([chunk.heading, chunk.document_path, chunk.endpoint && `${chunk.endpoint.method} ${chunk.endpoint.path}`, ...chunk.symbols, ...chunk.source_paths].filter(Boolean).join(" "));
        const body = normalize(chunk.content);
        let score = metadata.includes(exact) ? 100 : body.includes(exact) ? 60 : 0;
        for (const term of terms)
            score += metadata.includes(term) ? 12 : body.includes(term) ? 3 : 0;
        if (chunk.endpoint) {
            const endpointText = normalize(`${chunk.endpoint.method} ${chunk.endpoint.path}`);
            if (exact.includes(normalize(chunk.endpoint.path)) || exact.includes(endpointText))
                score += 80;
            score += terms.filter((term) => endpointText.includes(term)).length * 35;
        }
        if (chunk.confidence_states.includes("supported"))
            score += 2;
        return { chunk, score };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.chunk.document_path.localeCompare(b.chunk.document_path));
    const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
    return { schema_version: 3, query, total: scored.length, results: scored.slice(0, limit).map(({ chunk, score }) => ({ score, chunk })) };
}
export async function expandDocumentContext(runRoot, seedIds, depth = 2, limit = 60) {
    const index = await loadDocumentationIntelligence(runRoot), byId = new Map(index.chunks.map((chunk) => [chunk.id, chunk]));
    const seeds = seedIds.filter((id) => byId.has(id)), visited = new Set(seeds), frontier = seeds.map((id) => ({ id, level: 0 }));
    const chunkDistance = new Map(seeds.map((id) => [id, 0])), adjacency = adjacencyIndex(index.links);
    while (frontier.length > 0 && visited.size < 5_000) {
        const current = frontier.shift();
        if (current.level >= Math.min(depth, 8))
            continue;
        for (const edge of adjacency.get(current.id) ?? []) {
            if (edge.to === current.id && edge.from !== current.id && !["contains_symbol", "implements", "implemented_by"].includes(edge.type))
                continue;
            const candidate = edge.from === current.id ? edge.to : edge.from, nextLevel = current.level + 1;
            if (byId.has(candidate)) {
                if ((chunkDistance.get(candidate) ?? Number.POSITIVE_INFINITY) > nextLevel)
                    chunkDistance.set(candidate, nextLevel);
                continue;
            }
            if (visited.has(candidate))
                continue;
            const technicalDegree = (adjacency.get(candidate) ?? []).filter((item) => !byId.has(item.from === candidate ? item.to : item.from)).length;
            if (technicalDegree > 64 && !/(?:Port(?:In|Out)?|Repository|Mapper|Entity|UseCase|Handler)(?:\.|$)/u.test(candidate))
                continue;
            visited.add(candidate);
            frontier.push({ id: candidate, level: nextLevel });
        }
    }
    const selected = new Set([...chunkDistance.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([id]) => id));
    const chunks = [...selected].map((id) => byId.get(id)).filter(Boolean);
    return { schema_version: 3, seed_chunk_ids: seedIds, depth, chunks, chunk_distances: Object.fromEntries([...chunkDistance].filter(([id]) => selected.has(id))), relations: index.links.filter((edge) => selected.has(edge.from) || selected.has(edge.to)) };
}
export async function prepareAnalysisContext(input) {
    const budget = { ...DEFAULT_BUDGET, ...input.budget };
    const index = await loadDocumentationIntelligence(input.runRoot);
    const search = await searchDocumentation(input.runRoot, input.query, { ...(input.repository === undefined ? {} : { repository: input.repository }), limit: 100 });
    const ranked = search.results.map((item) => item.chunk);
    const primaryDocument = ranked[0]?.document_path;
    const primarySeeds = primaryDocument
        ? ranked.filter((chunk) => chunk.document_path === primaryDocument).slice(0, 8)
        : [];
    const seedChunks = primarySeeds.length > 0 ? primarySeeds : ranked.slice(0, 2);
    const expanded = await expandDocumentContext(input.runRoot, seedChunks.map((chunk) => chunk.id), 8, 1_000);
    const rank = new Map(ranked.map((chunk, index) => [chunk.id, index]));
    const seedSet = new Set(seedChunks.map((chunk) => chunk.id));
    const contextTerms = queryTokens(input.query);
    const expansionDistance = new Map(Object.entries(expanded.chunk_distances));
    const candidates = dedupeChunks([...expanded.chunks, ...ranked]).sort((a, b) => contextualPriority(b, input.intent, expansionDistance, seedSet, contextTerms) - contextualPriority(a, input.intent, expansionDistance, seedSet, contextTerms) || (rank.get(a.id) ?? 10_000) - (rank.get(b.id) ?? 10_000) || estimateTokens(a.content) - estimateTokens(b.content));
    const orderedCandidates = input.intent === "development" ? structuralFirst(candidates, seedSet) : candidates;
    const selected = [], perRepository = new Map(), selectedSymbols = new Set();
    let tokensUsed = 0, flows = 0, symbols = 0;
    for (const chunk of orderedCandidates) {
        const estimated = estimateTokens(chunk.content), documents = new Set(selected.map((item) => item.document_path));
        if (!documents.has(chunk.document_path) && documents.size >= budget.max_documents)
            continue;
        if ((perRepository.get(chunk.repository_id) ?? 0) >= budget.max_documents_per_repository && !selected.some((item) => item.document_path === chunk.document_path))
            continue;
        if (chunk.document_type === "flow" && flows >= budget.max_flows)
            continue;
        const chunkSymbols = meaningfulSymbols(chunk.symbols), newSymbols = chunkSymbols.filter((symbol) => !selectedSymbols.has(symbol)).length;
        if (symbols + newSymbols > budget.max_symbols)
            continue;
        if (tokensUsed + estimated > budget.max_context_tokens)
            continue;
        selected.push(chunk);
        tokensUsed += estimated;
        symbols += newSymbols;
        for (const symbol of chunkSymbols)
            selectedSymbols.add(symbol);
        if (chunk.document_type === "flow")
            flows++;
        perRepository.set(chunk.repository_id, (perRepository.get(chunk.repository_id) ?? 0) + (documents.has(chunk.document_path) ? 0 : 1));
    }
    const unresolved = index.links.filter((link) => link.status !== "supported" && selected.some((chunk) => chunk.id === link.from || chunk.id === link.to)).length;
    const missing = missingInformation(selected, input.intent);
    const context = { schema_version: 3, context_id: stableId("context", input.runId, input.intent, input.query, selected.map((chunk) => chunk.id)), run_id: input.runId, intent: input.intent, query: input.query, chunks: selected, statistics: { documents_considered: new Set(candidates.map((chunk) => chunk.document_path)).size, documents_selected: new Set(selected.map((chunk) => chunk.document_path)).size, repositories_represented: [...new Set(selected.map((chunk) => chunk.repository_id))].filter((id) => id !== "_workspace"), estimated_tokens: tokensUsed, omitted_by_budget: candidates.length - selected.length, unresolved_relations: unresolved }, missing_information: missing, sufficient: selected.some((chunk) => chunk.document_type === "flow") && missing.length === 0 };
    const cache = join(input.runRoot, "documentation-intelligence", "context-cache", `${context.context_id}.json`);
    await atomicWrite(cache, `${JSON.stringify(context, null, 2)}\n`);
    return context;
}
export async function loadContext(runRoot, contextId) {
    if (!/^context-[A-Za-z0-9]+$/u.test(contextId))
        throw new Error("context_id inválido.");
    return JSON.parse(await readFile(join(runRoot, "documentation-intelligence", "context-cache", `${contextId}.json`), "utf8"));
}
function priority(chunk, intent) {
    const weights = { development: /flow|router|contract|method|mapper|repository|data/u, migration: /flow|contract|data|integration|service|architecture/u, impact: /call|caller|contract|integration|data|module/u, responsibilities: /service|architecture|flow|integration|data/u };
    let score = weights[intent].test(chunk.section_type) ? 10 : 0;
    if (intent === "development") {
        const technical = [...chunk.roles, ...chunk.source_paths].join(" ");
        score += Math.max(/repository/iu.test(technical) ? 45 : 0, /\bport\b|port\/(?:in|out)|port(?:in|out)/iu.test(technical) ? 40 : 0, /mapper/iu.test(technical) ? 35 : 0, /entity/iu.test(technical) ? 30 : 0, /router|handler/iu.test(technical) ? 20 : 0);
        if (/^(?:class|interface|record|enum)\s+/iu.test(chunk.heading ?? ""))
            score += 60;
    }
    if (chunk.endpoint !== null)
        score += 8;
    if (chunk.repository_id !== "_workspace")
        score += 2;
    if (chunk.evidence_ids.length > 0)
        score += 1;
    return score;
}
function contextualPriority(chunk, intent, expansionDistance, seeds, queryTerms) { const distance = expansionDistance.get(chunk.id), metadata = normalize(`${chunk.heading ?? ""} ${chunk.document_path} ${chunk.source_paths.join(" ")}`), affinity = queryTerms.filter((term) => metadata.includes(term)).length * 15; return priority(chunk, intent) + affinity + (distance === undefined ? 0 : Math.max(20, 300 - distance * 40)) + (seeds.has(chunk.id) ? 1_000 : 0); }
function missingInformation(chunks, intent) { const types = chunks.map((chunk) => chunk.section_type).join(" "), technical = chunks.flatMap((chunk) => [...chunk.roles, ...chunk.source_paths]).join(" "), missing = []; if (!/flow/u.test(types))
    missing.push("flujo de entrada relacionado"); if (!/data|persist|repository/u.test(`${types} ${technical}`))
    missing.push("propiedad o acceso de persistencia"); if ((intent === "migration" || intent === "responsibilities") && new Set(chunks.map((chunk) => chunk.repository_id).filter((id) => id !== "_workspace")).size < 2)
    missing.push("participación de otros sistemas"); return missing; }
function adjacencyIndex(links) { const result = new Map(); for (const edge of links) {
    if (edge.type === "documents" || edge.status === "unresolved")
        continue;
    result.set(edge.from, [...(result.get(edge.from) ?? []), edge]);
    result.set(edge.to, [...(result.get(edge.to) ?? []), edge]);
} return result; }
function dedupeChunks(chunks) { return [...new Map(chunks.map((chunk) => [chunk.id, chunk])).values()]; }
function structuralFirst(chunks, seeds) {
    const classChunks = chunks.filter((chunk) => /^(?:class|interface|record|enum)\s+/iu.test(chunk.heading ?? ""));
    const pick = (pattern, limit = 1) => classChunks.filter((chunk) => pattern.test(chunk.heading ?? "")).slice(0, limit);
    return dedupeChunks([
        ...chunks.filter((chunk) => seeds.has(chunk.id)),
        ...pick(/Router\b/iu), ...pick(/Handler\b/iu), ...pick(/(?:UseCase|Service)\b/iu), ...pick(/Port(?:In|Out)?\b/iu),
        ...pick(/Mapper(?:Dto|DTO)?\b/iu, 2), ...pick(/Repository\b/iu, 2), ...pick(/Entity\b/iu),
        ...chunks,
    ]);
}
function estimateTokens(value) { return Math.ceil(Buffer.byteLength(value, "utf8") / 4); }
function meaningfulSymbols(values) { return values.filter((value) => /^[A-Z]/u.test(value) && !/\.(?:java|class)$/iu.test(value) && !/^(?:ServerResponse|MediaType|Mono|Flux|String|Math|Integer|Boolean|List|Logger|PageResponse|Type)\b/u.test(value)); }
function normalize(value) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("en-US"); }
function tokens(value) { return [...new Set(normalize(value).split(/[^a-z0-9_./-]+/gu).filter((token) => token.length > 2))]; }
function queryTokens(value) { const result = tokens(value).filter((token) => !["para", "como", "desde", "sobre"].includes(token)); if (result.some((token) => token === "administracion" || token === "administrativo" || token === "administrativos"))
    result.push("admin"); if (result.some((token) => token === "permiso" || token === "permisos"))
    result.push("permission", "permissions"); return [...new Set(result)]; }
//# sourceMappingURL=retrieval.js.map