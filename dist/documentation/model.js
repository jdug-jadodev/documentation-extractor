import { stableId } from "../platform/hash.js";
export const ASD_SECTIONS = [
    { id: "control_documental", title: "Control documental", required: true }, { id: "resumen", title: "Resumen", required: true }, { id: "objetivo_alcance", title: "Objetivo y alcance", required: true },
    { id: "contexto", title: "Contexto de la solución", required: true }, { id: "requisitos", title: "Requisitos y capacidades", required: true }, { id: "arquitectura", title: "Arquitectura de la solución", required: true },
    { id: "responsabilidades", title: "Responsabilidades por microservicio", required: true }, { id: "interfaces", title: "Interfaces y contratos", required: true }, { id: "datos", title: "Datos y persistencia", required: true },
    { id: "flujos", title: "Flujos funcionales y técnicos", required: true }, { id: "seguridad", title: "Seguridad y configuración", required: true }, { id: "despliegue_operacion", title: "Despliegue y operación", required: true },
    { id: "pruebas", title: "Pruebas y validación", required: true }, { id: "riesgos", title: "Riesgos, limitaciones y desconocidos", required: true }, { id: "decisiones", title: "Decisiones y recomendaciones", required: true },
    { id: "evidencias", title: "Evidencias y trazabilidad", required: true }, { id: "anexos", title: "Anexos", required: false }
];
export function createDocumentModel(input) {
    const interpreted = new Map((input.interpretedSections ?? []).map((item) => [item.section_id, item]));
    const factByKind = groupFacts(input.facts);
    const sections = ASD_SECTIONS.map((definition) => {
        const generated = factualSection(definition.id, factByKind, input.graph, input.snapshots);
        const addition = interpreted.get(definition.id);
        const paragraphs = [...generated.paragraphs, ...(addition?.paragraphs ?? [])];
        const limitations = [...generated.limitations, ...(addition?.unknowns ?? [])];
        if (paragraphs.length === 0 && generated.tables.length === 0) {
            paragraphs.push("Desconocido para el alcance analizado.");
            limitations.push("No existe evidencia suficiente para completar esta sección.");
        }
        return { id: definition.id, title: definition.title, required: definition.required, paragraphs, claims: generated.claims, tables: generated.tables, limitations, interpretation_status: addition ? "interpreted" : limitations.length > 0 ? "pending" : "factual" };
    });
    return { schema_version: 3, document_id: stableId("document", input.runId, input.snapshots.map((item) => item.id)), run_id: input.runId, title: input.title, repositories: [...new Set(input.snapshots.map((item) => item.repository_id))], snapshots: input.snapshots, status: sections.some((section) => section.limitations.length > 0) ? "review_required" : "review", format: "ASD-TSE-100", language: "es-CO", archify: { status: input.archifyAvailable ? "executed" : "unavailable", mode: input.archifyAvailable ? "archify" : "fallback", version: input.archifyVersion ?? null }, sections };
}
function factualSection(id, facts, graph, snapshots) {
    const base = { paragraphs: [], claims: [], tables: [], limitations: [] };
    if (id === "control_documental")
        base.tables.push({ headers: ["Repositorio", "Referencia", "Commit", "Estado"], rows: snapshots.map((snapshot) => [snapshot.repository_id, snapshot.requested_ref, snapshot.commit_oid, snapshot.dirty ? "Borrador local" : "Commit"]) });
    if (id === "resumen")
        base.paragraphs.push(`Documento factual para ${snapshots.length} captura(s), con ${[...facts.values()].flat().length} hecho(s) y ${graph.edges.length} relación(es).`);
    if (id === "objetivo_alcance")
        base.paragraphs.push("Describe exclusivamente hechos extraídos de las capturas indicadas; no acredita comportamiento en producción.");
    if (id === "contexto")
        base.paragraphs.push("Los repositorios permanecen fuera de la boveda. Las relaciones declaradas se clasifican por evidencia estática.");
    if (id === "interfaces") {
        const endpoints = [...(facts.get("http_endpoint") ?? []), ...(facts.get("http_endpoint_fragment") ?? [])];
        const clients = [...(facts.get("http_client_call") ?? []), ...(facts.get("http_client_base") ?? [])];
        base.tables.push({
            headers: ["Componente", "Dirección", "Método", "Ruta o expresión", "Estado", "Evidencia"],
            rows: [
                ...endpoints.map((fact) => { const value = record(fact.value); return [fact.component_id, "entrada", stringify(value.method), stringify(value.path), stringify(value.route_scope ?? "observado"), fact.evidence_ids.join(", ")]; }),
                ...clients.map((fact) => { const value = record(fact.value); return [fact.component_id, "salida", stringify(value.method), stringify(value.path_expression ?? value.base_url ?? value.target), value.resolved === false || value.target === null ? "no resuelto" : "observado", fact.evidence_ids.join(", ")]; })
            ]
        });
        const mounts = facts.get("http_route_mount") ?? [];
        if (mounts.length > 0)
            base.tables.push({ headers: ["Componente", "Montaje observado", "Router", "Evidencia"], rows: mounts.map((fact) => { const value = record(fact.value); return [fact.component_id, stringify(value.path), stringify(value.router_symbol), fact.evidence_ids.join(", ")]; }) });
    }
    if (id === "responsabilidades")
        base.tables.push({ headers: ["Componente", "Hechos", "Límites"], rows: [...new Set([...facts.values()].flat().map((fact) => fact.component_id))].map((component) => [component, String([...facts.values()].flat().filter((fact) => fact.component_id === component).length), "La intención de negocio requiere revisión humana."]) });
    if (id === "datos")
        base.tables.push({ headers: ["Componente", "Tipo", "Valor", "Evidencia"], rows: [...(facts.get("data_entity") ?? []), ...(facts.get("data_read") ?? []), ...(facts.get("data_write") ?? [])].map((fact) => [fact.component_id, fact.kind, stringify(fact.value), fact.evidence_ids.join(", ")]) });
    if (id === "arquitectura" || id === "flujos")
        base.tables.push({ headers: ["Origen", "Relación", "Destino", "Estado", "Evidencia"], rows: graph.edges.map((edge) => [nodeLabel(graph, edge.from), edge.type, nodeLabel(graph, edge.to), edge.status, edge.evidence_ids.join(", ")]) });
    if (id === "seguridad") {
        base.paragraphs.push("La autenticación y autorización se mantienen como desconocidas salvo evidencia explícita.");
        base.limitations.push("El análisis estático no demuestra controles efectivos en despliegue.");
    }
    if (id === "despliegue_operacion")
        base.limitations.push("No se ejecutaron aplicaciones ni se observó infraestructura de producción.");
    if (id === "pruebas")
        base.paragraphs.push("Las pruebas del motor y de las aplicaciones se registran por separado; este documento no inventa resultados.");
    if (id === "riesgos")
        base.tables.push({ headers: ["Tipo", "Descripción"], rows: graph.edges.flatMap((edge) => edge.limitations.map((limit) => [edge.status, limit])) });
    if (id === "decisiones")
        base.paragraphs.push("No se aprobaron decisiones ni propuestas automáticamente.");
    if (id === "evidencias")
        base.tables.push({ headers: ["Hecho", "Componente", "Tipo", "Valor observado", "Regla", "Evidencias"], rows: [...facts.values()].flat().map((fact) => [fact.id, fact.component_id, fact.kind, stringify(fact.value), fact.rule_id, fact.evidence_ids.join(", ")]) });
    if (id === "anexos")
        base.paragraphs.push(`Escenario: ${graph.scenario_id}.`);
    return base;
}
function groupFacts(facts) { const result = new Map(); for (const fact of facts)
    result.set(fact.kind, [...(result.get(fact.kind) ?? []), fact]); return result; }
function nodeLabel(graph, id) { const node = graph.nodes.find((item) => item.id === id); return node ? `${node.label} (${node.type})` : id; }
function record(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function stringify(value) { if (Array.isArray(value))
    return value.join(", "); if (value === null || value === undefined || value === "")
    return "Desconocido"; return typeof value === "object" ? JSON.stringify(value) : String(value); }
//# sourceMappingURL=model.js.map