import type { DocumentModel, DocumentSection, Fact, Finding, KnowledgeGraph, Snapshot } from "../contracts/types.js";
import { stableId } from "../platform/hash.js";

export const ASD_SECTIONS: ReadonlyArray<{ id: string; title: string; required: boolean }> = [
  { id: "control_documental", title: "Control documental", required: true }, { id: "resumen", title: "Resumen", required: true }, { id: "objetivo_alcance", title: "Objetivo y alcance", required: true },
  { id: "contexto", title: "Contexto de la solución", required: true }, { id: "requisitos", title: "Requisitos y capacidades", required: true }, { id: "arquitectura", title: "Arquitectura de la solución", required: true },
  { id: "responsabilidades", title: "Responsabilidades por microservicio", required: true }, { id: "interfaces", title: "Interfaces y contratos", required: true }, { id: "datos", title: "Datos y persistencia", required: true },
  { id: "flujos", title: "Flujos funcionales y técnicos", required: true }, { id: "seguridad", title: "Seguridad y configuración", required: true }, { id: "despliegue_operacion", title: "Despliegue y operación", required: true },
  { id: "pruebas", title: "Pruebas y validación", required: true }, { id: "riesgos", title: "Riesgos, limitaciones y desconocidos", required: true }, { id: "decisiones", title: "Decisiones y recomendaciones", required: true },
  { id: "evidencias", title: "Evidencias y trazabilidad", required: true }, { id: "anexos", title: "Anexos", required: false }
];

export function createDocumentModel(input: { runId: string; title: string; snapshots: Snapshot[]; facts: Fact[]; findings?: Finding[]; graph: KnowledgeGraph; interpretedSections?: Array<{ section_id: string; paragraphs: string[]; fact_ids: string[]; finding_ids: string[]; unknowns: string[] }>; archifyAvailable: boolean; archifyVersion?: string | null }): DocumentModel {
  const interpreted = new Map((input.interpretedSections ?? []).map((item) => [item.section_id, item]));
  const factByKind = groupFacts(input.facts);
  const sections: DocumentSection[] = ASD_SECTIONS.map((definition) => {
    const generated = factualSection(definition.id, factByKind, input.graph, input.snapshots);
    const addition = interpreted.get(definition.id);
    const paragraphs = [...generated.paragraphs, ...(addition?.paragraphs ?? [])];
    const limitations = [...generated.limitations, ...(addition?.unknowns ?? [])];
    if (paragraphs.length === 0 && generated.tables.length === 0) { paragraphs.push("Desconocido para el alcance analizado."); limitations.push("No existe evidencia suficiente para completar esta sección."); }
    return { id: definition.id, title: definition.title, required: definition.required, paragraphs, claims: generated.claims, tables: generated.tables, limitations, interpretation_status: addition ? "interpreted" : limitations.length > 0 ? "pending" : "factual" };
  });
  if (input.facts.length === 0) sections.find((section) => section.id === "riesgos")?.limitations.push("Desconocido: el alcance no contiene hechos extraídos.");
  return { schema_version: 3, document_id: stableId("document", input.runId, input.snapshots.map((item) => item.id)), run_id: input.runId, title: input.title, repositories: [...new Set(input.snapshots.map((item) => item.repository_id))], snapshots: input.snapshots, status: "final", format: "ASD-TSE-100", language: "es-CO", archify: { status: input.archifyAvailable ? "executed" : "unavailable", mode: input.archifyAvailable ? "archify" : "fallback", version: input.archifyVersion ?? null }, sections };
}

function factualSection(id: string, facts: Map<string, Fact[]>, graph: KnowledgeGraph, snapshots: Snapshot[]): Pick<DocumentSection, "paragraphs" | "claims" | "tables" | "limitations"> {
  const base = { paragraphs: [] as string[], claims: [] as DocumentSection["claims"], tables: [] as DocumentSection["tables"], limitations: [] as string[] };
  if (id === "control_documental") base.tables.push({ headers: ["Repositorio", "Referencia", "Commit", "Estado"], rows: snapshots.map((snapshot) => [snapshot.repository_id, snapshot.requested_ref, snapshot.commit_oid, snapshot.dirty ? "Borrador local" : "Commit"] ) });
  if (id === "resumen") base.paragraphs.push(`Documento factual para ${snapshots.length} captura(s), con ${[...facts.values()].flat().length} hecho(s) y ${graph.edges.length} relación(es).`);
  if (id === "objetivo_alcance") base.paragraphs.push("Describe exclusivamente hechos extraídos de las capturas indicadas; no acredita comportamiento en producción.");
  if (id === "contexto") {
    const modules = facts.get("source_module") ?? [], symbols = facts.get("code_symbol") ?? [];
    base.paragraphs.push(`El alcance contiene ${modules.length} módulo(s) fuente y ${symbols.length} símbolo(s) observado(s), incluidos métodos de clase cuando su firma es extraíble. Los repositorios permanecen fuera de la bóveda y las relaciones se clasifican por evidencia estática.`);
    base.tables.push({ headers: ["Capa", "Módulos", "Símbolos"], rows: groupedArchitecture(modules, symbols, "layer") });
  }
  if (id === "requisitos") {
    const all = [...facts.values()].flat();
    base.tables.push({ headers: ["Capacidad observada", "Cantidad"], rows: [
      ["Endpoints HTTP de entrada", String(all.filter((fact) => fact.kind === "http_endpoint" || fact.kind === "http_endpoint_fragment").length)],
      ["Llamadas HTTP salientes", String(all.filter((fact) => fact.kind === "http_client_call" || fact.kind === "http_client_base").length)],
      ["Módulos fuente", String(all.filter((fact) => fact.kind === "source_module").length)],
      ["Clases, funciones y métodos", String(all.filter((fact) => fact.kind === "code_symbol").length)],
      ["Recursos de datos", String(all.filter((fact) => fact.kind === "data_entity").length)]
    ] });
  }
  if (id === "interfaces") {
    const endpoints = resolvedEndpoints(facts);
    const clients = [...(facts.get("http_client_call") ?? []), ...(facts.get("http_client_base") ?? [])];
    base.tables.push({
      headers: ["Componente", "Dirección", "Método", "Ruta o expresión", "Handler", "Estado", "Evidencia"],
      rows: [
        ...endpoints.map((endpoint) => [endpoint.component, "entrada", endpoint.method, endpoint.path, endpoint.handler, endpoint.status, endpoint.evidence]),
        ...clients.map((fact) => { const value = record(fact.value); return [fact.component_id, "salida", stringify(value.method), stringify(value.path_expression ?? value.base_url ?? value.target), "cliente HTTP", value.resolved === false || value.target === null ? "no resuelto" : "observado", fact.evidence_ids.join(", ")]; })
      ]
    });
    const mounts = facts.get("http_route_mount") ?? [];
    if (mounts.length > 0) base.tables.push({ headers: ["Componente", "Montaje observado", "Router", "Evidencia"], rows: mounts.map((fact) => { const value = record(fact.value); return [fact.component_id, stringify(value.path), stringify(value.router_symbol), fact.evidence_ids.join(", ")]; }) });
  }
  if (id === "responsabilidades") {
    const symbols = facts.get("code_symbol") ?? [];
    base.tables.push({ headers: ["Rol interno", "Cantidad", "Elementos observados"], rows: groupSymbolsByRole(symbols) });
    base.tables.push({ headers: ["Rol", "Clase", "Método o símbolo", "Tipo", "Firma", "Qué hace", "Archivo", "Evidencia"], rows: symbols.map((fact) => { const value = record(fact.value); return [stringify(value.role), symbolOwner(value), stringify(value.name), stringify(value.symbol_type), stringify(value.signature), symbolDescription(value), stringify(value.source_path), fact.evidence_ids.join(", ")]; }) });
    base.limitations.push("Las descripciones indican su base de inferencia. Una descripción derivada del nombre, firma o llamadas estáticas no demuestra el comportamiento en ejecución.");
  }
  if (id === "datos") base.tables.push({ headers: ["Componente", "Tipo", "Valor", "Evidencia"], rows: [...(facts.get("data_entity") ?? []), ...(facts.get("data_read") ?? []), ...(facts.get("data_write") ?? [])].map((fact) => [fact.component_id, fact.kind, stringify(fact.value), fact.evidence_ids.join(", ")]) });
  if (id === "arquitectura" || id === "flujos") {
    base.tables.push({ headers: ["Origen", "Relación", "Destino", "Estado", "Evidencia"], rows: graph.edges.map((edge) => [nodeLabel(graph, edge.from), edge.type, nodeLabel(graph, edge.to), edge.status, edge.evidence_ids.join(", ")]) });
    const internal = (facts.get("module_dependency") ?? []).filter((fact) => record(fact.value).external === false);
    base.tables.push({ headers: ["Módulo origen", "Depende de", "Importaciones", "Evidencia"], rows: internal.map((fact) => { const value = record(fact.value); return [stringify(value.source_path), stringify(value.target_path ?? value.specifier), stringify(value.imports), fact.evidence_ids.join(", ")]; }) });
  }
  if (id === "seguridad") { base.paragraphs.push("La autenticación y autorización se mantienen como desconocidas salvo evidencia explícita."); base.limitations.push("El análisis estático no demuestra controles efectivos en despliegue."); }
  if (id === "despliegue_operacion") {
    const packages = facts.get("package_dependency") ?? [], technologies = facts.get("technology") ?? [], scripts = facts.get("build_script") ?? [];
    base.tables.push({ headers: ["Tecnología o paquete", "Versión/valor", "Alcance", "Evidencia"], rows: [...technologies.map((fact) => { const value = record(fact.value); return [stringify(value.technology), stringify(value.value), "runtime", fact.evidence_ids.join(", ")]; }), ...packages.map((fact) => { const value = record(fact.value); return [stringify(value.package), stringify(value.declared_version), stringify(value.scope), fact.evidence_ids.join(", ")]; })] });
    base.tables.push({ headers: ["Script", "Comando observado", "Evidencia"], rows: scripts.map((fact) => { const value = record(fact.value); return [stringify(value.name), stringify(value.command), fact.evidence_ids.join(", ")]; }) });
    base.limitations.push("No se ejecutaron aplicaciones ni se observó infraestructura de producción.");
  }
  if (id === "pruebas") base.paragraphs.push("Las pruebas del motor y de las aplicaciones se registran por separado; este documento no inventa resultados.");
  if (id === "riesgos") base.tables.push({ headers: ["Tipo", "Descripción"], rows: graph.edges.flatMap((edge) => edge.limitations.map((limit) => [edge.status, limit])) });
  if (id === "decisiones") base.paragraphs.push("La documentación factual se publica automáticamente después de validación mecánica. Las ADR, migraciones y decisiones de diseño conservan su carácter de propuesta.");
  if (id === "evidencias") base.tables.push({ headers: ["Tipo de hecho", "Cantidad", "Ejemplos de evidencia"], rows: [...facts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([kind, values]) => [kind, String(values.length), values.slice(0, 5).flatMap((fact) => fact.evidence_ids).join(", ")]) });
  if (id === "anexos") base.paragraphs.push(`Escenario: ${graph.scenario_id}.`);
  return base;
}

function groupFacts(facts: Fact[]): Map<string, Fact[]> { const result = new Map<string, Fact[]>(); for (const fact of facts) result.set(fact.kind, [...(result.get(fact.kind) ?? []), fact]); return result; }
function groupedArchitecture(modules: Fact[], symbols: Fact[], field: string): string[][] {
  const keys = new Set([...modules, ...symbols].map((fact) => stringify(record(fact.value)[field])));
  return [...keys].sort().map((key) => [key, String(modules.filter((fact) => stringify(record(fact.value)[field]) === key).length), String(symbols.filter((fact) => stringify(record(fact.value)[field]) === key).length)]);
}
function groupSymbolsByRole(symbols: Fact[]): string[][] {
  const grouped = new Map<string, string[]>();
  for (const fact of symbols) { const value = record(fact.value), role = stringify(value.role); grouped.set(role, [...(grouped.get(role) ?? []), `${stringify(value.name)} [${stringify(value.symbol_type)}] — ${stringify(value.source_path)}`]); }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([role, values]) => [role, String(values.length), values.join("; ")]);
}
function symbolDescription(value: Record<string, unknown>): string {
  if (typeof value.description === "string" && value.description.trim() !== "") return value.description;
  const owner = typeof value.class_name === "string" ? ` de ${value.class_name}` : "";
  return `${stringify(value.symbol_type)} ${stringify(value.name)}${owner}. No se extrajo una descripción más específica.`;
}
function symbolOwner(value: Record<string, unknown>): string { if (typeof value.class_name === "string" && value.class_name !== "") return value.class_name; if (["class", "interface", "enum", "record"].includes(String(value.symbol_type))) return String(value.name); return "Función independiente / no aplica"; }
export interface ResolvedEndpoint { component: string; method: string; path: string; handler: string; source_path: string; status: string; evidence: string; }
export function resolveEndpointFacts(allFacts: readonly Fact[]): ResolvedEndpoint[] { return resolvedEndpoints(groupFacts([...allFacts])); }
function resolvedEndpoints(facts: Map<string, Fact[]>): ResolvedEndpoint[] {
  const endpoints = [...(facts.get("http_endpoint") ?? []), ...(facts.get("http_endpoint_fragment") ?? [])];
  const mounts = facts.get("http_route_mount") ?? [], imports = facts.get("module_dependency") ?? [];
  return endpoints.flatMap((fact) => {
    const value = record(fact.value), sourcePath = stringify(value.source_path), path = stringify(value.path), method = stringify(value.method);
    const handler = stringify(value.handler_expression), source_path = sourcePath;
    if (fact.kind === "http_endpoint" || value.route_scope === "application") return [{ component: fact.component_id, method, path, handler, source_path, status: "ruta completa", evidence: fact.evidence_ids.join(", ") }];
    const matchingMounts = mounts.filter((mount) => {
      if (mount.component_id !== fact.component_id) return false;
      const mountValue = record(mount.value), symbol = stringify(mountValue.router_symbol), mountSource = stringify(mountValue.source_path);
      return imports.some((dependency) => { const dependencyValue = record(dependency.value); return dependency.component_id === fact.component_id && stringify(dependencyValue.source_path) === mountSource && stringify(dependencyValue.target_path) === sourcePath && Array.isArray(dependencyValue.imports) && dependencyValue.imports.map(String).includes(symbol); }) || normalizedSymbol(symbol) === normalizedSymbol(sourcePath.split("/").at(-1)?.replace(/\.[^.]+$/u, "") ?? "");
    });
    if (matchingMounts.length === 0) return [{ component: fact.component_id, method, path, handler, source_path, status: "fragmento; montaje no resuelto", evidence: fact.evidence_ids.join(", ") }];
    return matchingMounts.map((mount) => ({ component: fact.component_id, method, path: joinRoute(stringify(record(mount.value).path), path), handler, source_path, status: "ruta compuesta estáticamente", evidence: [...fact.evidence_ids, ...mount.evidence_ids].join(", ") }));
  });
}
function normalizedSymbol(value: string): string { return value.toLocaleLowerCase("en-US").replace(/(?:router|routes?|[-_.])/gu, ""); }
function joinRoute(prefix: string, path: string): string { const value = `${prefix}/${path}`.replace(/\/{2,}/gu, "/").replace(/\/$/u, ""); return value || "/"; }
function nodeLabel(graph: KnowledgeGraph, id: string): string { const node = graph.nodes.find((item) => item.id === id); return node ? `${node.label} (${node.type})` : id; }
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function stringify(value: unknown): string { if (Array.isArray(value)) return value.join(", "); if (value === null || value === undefined || value === "") return "Desconocido"; return typeof value === "object" ? JSON.stringify(value) : String(value); }
