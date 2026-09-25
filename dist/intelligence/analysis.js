import { stableId } from "../platform/hash.js";
import { loadDocumentationIntelligence } from "./index.js";
import { prepareAnalysisContext } from "./retrieval.js";
export async function locateCapability(runRoot, query) {
    const index = await loadDocumentationIntelligence(runRoot), terms = queryTokens(query), exact = terms.join("-");
    const matches = index.capabilities.map((capability) => {
        const values = searchable(capability);
        const coverage = terms.filter((term) => values.some((value) => value.includes(term))).length;
        const exactBonus = normalize(capability.id) === exact || values.some((value) => value.includes(terms.join(" "))) ? 100 : 0;
        const specificity = terms.every((term) => normalize(capability.id).includes(term)) ? 40 + terms.length * 10 : 0;
        return { capability, score: exactBonus + specificity + coverage * 8 + terms.reduce((score, term) => score + values.filter((value) => value.includes(term)).length, 0) };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || b.capability.id.length - a.capability.id.length || a.capability.id.localeCompare(b.capability.id));
    return { schema_version: 3, query, matches, total: matches.length };
}
export async function traceBusinessFlow(runRoot, query) {
    const context = await prepareAnalysisContext({ runId: runIdFromRoot(runRoot), runRoot, query, intent: "responsibilities" });
    const index = await loadDocumentationIntelligence(runRoot), selected = new Set(context.chunks.map((chunk) => chunk.id)), components = new Set(context.statistics.repositories_represented.map((repository) => `component:${repository}`));
    return { schema_version: 3, run_id: context.run_id, query, context_id: context.context_id, entrypoints: context.chunks.filter((chunk) => chunk.endpoint !== null).map((chunk) => ({ repository: chunk.repository_id, endpoint: chunk.endpoint, document: chunk.document_path })), steps: context.chunks.filter((chunk) => /flow:steps|method:|class:/u.test(chunk.section_type)).map((chunk) => ({ repository: chunk.repository_id, heading: chunk.heading, symbols: chunk.symbols, source_paths: chunk.source_paths, confidence: chunk.confidence_states })), relations: index.links.filter((link) => selected.has(link.from) || selected.has(link.to) || components.has(link.from) || components.has(link.to)), limitations: context.missing_information };
}
export async function explainResponsibilities(runRoot, query) {
    const located = await locateCapability(runRoot, query), capability = located.matches[0]?.capability;
    if (capability === undefined)
        return { schema_version: 3, query, status: "unresolved", responsibilities: [], limitations: ["No se localizó una capacidad documental relacionada."] };
    return { schema_version: 3, query, status: capability.confidence === "high" ? "supported" : "candidate", capability_id: capability.id, repositories: capability.repositories, responsibilities: capability.responsibilities, legacy_dependencies: capability.legacy_dependencies, evidence_ids: capability.evidence_ids, limitations: capability.responsibilities.length === 0 ? ["La propiedad de negocio necesita confirmación humana en overrides.intelligence.ownership."] : [] };
}
export async function analyzeChange(input) {
    const context = input.contextId === undefined ? await prepareAnalysisContext({ runId: input.runId, runRoot: input.runRoot, query: input.request, intent: "impact" }) : await loadContextLocal(input.runRoot, input.contextId);
    const repositories = [...new Set(context.chunks.map((chunk) => chunk.repository_id).filter((id) => id !== "_workspace"))];
    const selectedEvidence = new Set(context.chunks.flatMap((chunk) => chunk.evidence_ids));
    const relevantEdges = input.graph.edges.filter((edge) => edge.evidence_ids.some((id) => selectedEvidence.has(id)) || repositories.some((repo) => edge.from === `component:${repo}` || edge.to === `component:${repo}`));
    const consumers = unique(relevantEdges.map((edge) => edge.from).filter((id) => !repositories.some((repo) => id === `component:${repo}`)));
    const data = unique(context.chunks.flatMap((chunk) => chunk.source_paths.filter((path) => /entity|repository|data/iu.test(path))));
    const unresolved = relevantEdges.filter((edge) => edge.status !== "supported").length + context.statistics.unresolved_relations;
    const dimensions = { repositories: repositories.length, consumers: consumers.length, synchronous_dependencies: relevantEdges.filter((edge) => edge.type === "calls_http").length, messages: relevantEdges.filter((edge) => edge.type === "publishes_to" || edge.type === "consumes_from").length, data_resources: data.length, unresolved_relations: unresolved, coordinated_deployments: repositories.length };
    const score = dimensions.repositories * 2 + dimensions.consumers * 2 + dimensions.synchronous_dependencies + dimensions.messages + dimensions.data_resources + unresolved * 2;
    const complexity = score >= 16 ? "alta" : score >= 7 ? "media" : "baja", criticality = dimensions.consumers >= 3 || dimensions.data_resources >= 2 ? "crítica" : score >= 8 ? "alta" : "media";
    const confidence = selectedEvidence.size >= 5 && unresolved === 0 ? "alta" : selectedEvidence.size > 0 ? "media" : "baja";
    return { schema_version: 3, analysis_id: stableId("impact", input.runId, input.request, context.context_id), run_id: input.runId, request: input.request, context_id: context.context_id, complexity, criticality, confidence, affected_repositories: repositories, consumers, data_resources: data, dimensions, factors: [`${repositories.length} repositorio(s) representado(s)`, `${consumers.length} consumidor(es) relacionado(s)`, `${dimensions.data_resources} recurso(s) de datos`, `${unresolved} relación(es) candidata(s) o no resuelta(s)`], risks: [unresolved > 0 ? "Existen relaciones por confirmar antes del cambio." : "No se observaron relaciones inciertas en el contexto seleccionado.", repositories.length > 1 ? "El cambio puede requerir despliegues coordinados." : "El alcance documental se concentra en un repositorio."], missing_information: context.missing_information, evidence_ids: [...selectedEvidence], no_time_or_cost_estimate: true };
}
export async function assessMigration(input) {
    const context = input.contextId === undefined ? await prepareAnalysisContext({ runId: input.runId, runRoot: input.runRoot, query: input.request, intent: "migration" }) : await loadContextLocal(input.runRoot, input.contextId);
    const impact = await analyzeChange({ runId: input.runId, runRoot: input.runRoot, request: input.request, facts: input.facts, graph: input.graph, contextId: context.context_id });
    const located = await locateCapability(input.runRoot, input.request), capability = located.matches[0]?.capability;
    const from = input.from ?? capability?.legacy_dependencies[0]?.from ?? null, to = input.to ?? capability?.legacy_dependencies[0]?.to ?? null;
    const remaining = input.graph.edges.filter((edge) => from !== null && (edge.from === `component:${from}` || edge.to === `component:${from}`));
    return { schema_version: 3, migration_id: stableId("migration-assessment", input.runId, input.request, from, to), run_id: input.runId, context_id: context.context_id, capability_id: capability?.id ?? null, from, to, status: from !== null && to !== null ? "candidate" : "unresolved", current_state: context.chunks.filter((chunk) => chunk.document_type === "flow" || chunk.document_type === "service").map((chunk) => ({ repository: chunk.repository_id, document: chunk.document_path, heading: chunk.heading })), remaining_legacy_dependencies: remaining, impact, phases: ["Preparar contratos compatibles y observabilidad", "Introducir destino manteniendo compatibilidad", "Migrar consumidores y datos de forma controlada", "Validar rollback y retirar origen sólo con aprobación"], rollback: ["Mantener el contrato anterior durante la transición", "Restaurar el enrutamiento al origen", "No eliminar datos ni implementación heredada antes de la verificación"], pending_decisions: [from === null ? "Confirmar sistema de origen." : "", to === null ? "Confirmar sistema objetivo." : "", ...context.missing_information].filter(Boolean), evidence_ids: unique(context.chunks.flatMap((chunk) => chunk.evidence_ids)) };
}
export function investigationDecision(context, requestedLevel = 1) {
    const level = Math.max(1, Math.min(requestedLevel, 6));
    if (context.sufficient)
        return { level: 1, status: "sufficient", next_action: "synthesize", authorization_required: false };
    if (level === 1)
        return { level: 2, status: "expand_documentation", next_action: "docsys_expand_document_context", authorization_required: false };
    if (level === 2)
        return { level: 3, status: "directed_analysis", next_action: "reuse indexed technical facts for reachable dependencies", authorization_required: false, limits: { max_dependency_depth: 3, max_files: 8, max_bytes: 262144 } };
    if (level === 3)
        return { level: 4, status: "source_evidence", next_action: "docsys_read_source_evidence", authorization_required: false, limits: { max_files: 8, max_bytes: 262144 } };
    if (level === 4)
        return { level: 5, status: "restricted_agent", next_action: "provide only context and authorized evidence", authorization_required: false, tools: [] };
    return { level: 6, status: "scope_expansion_required", next_action: "request explicit authorization", authorization_required: true, missing_information: context.missing_information };
}
function searchable(capability) { return [capability.id, capability.name, ...capability.aliases, ...capability.entrypoints].map(normalize); }
function tokens(value) { return [...new Set(normalize(value).split(/[^a-z0-9_./-]+/gu).filter((token) => token.length > 2))]; }
function queryTokens(value) { return [...new Set(tokens(value).map((token) => token === "administracion" || token.startsWith("administrativ") ? "admin" : token).filter((token) => !["para", "como", "desde", "sobre"].includes(token)))]; }
function normalize(value) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("en-US"); }
function unique(values) { return [...new Set(values)]; }
function runIdFromRoot(root) { return root.replaceAll("\\", "/").split("/").at(-1) ?? "unknown"; }
async function loadContextLocal(runRoot, contextId) { const { loadContext } = await import("./retrieval.js"); return await loadContext(runRoot, contextId); }
//# sourceMappingURL=analysis.js.map