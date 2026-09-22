import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { DocumentModel, Fact, GraphEdge, KnowledgeGraph } from "../contracts/types.js";
import { atomicWrite } from "../platform/fs.js";
import { renderDocument, renderRelationshipMermaid } from "../documentation/render.js";
import { renderEditionIndex, renderGraphTable, serviceDocumentPath } from "./navigation.js";
import { resolveEndpointFacts, type ResolvedEndpoint } from "../documentation/model.js";

interface ModuleEdge { from: string; to: string; imports: string[]; }
interface FlowPoint extends ResolvedEndpoint { direction: "entrada" | "salida"; transport: string; target: string; }
interface ServiceFlow { endpoint: FlowPoint; slug: string; path: string; module_edges: ModuleEdge[]; }

export async function buildCandidateVault(root: string, model: DocumentModel, graph: KnowledgeGraph, serviceModels: ReadonlyMap<string, DocumentModel> = new Map(), facts: readonly Fact[] = []): Promise<void> {
  await mkdir(root, { recursive: true });
  const allFlows: ServiceFlow[] = [];
  await atomicWrite(join(root, "Inicio.md"), renderEditionIndex(model));
  for (const snapshot of model.snapshots) {
    const repositoryId = snapshot.repository_id;
    const serviceModel = serviceModels.get(repositoryId) ?? model;
    const serviceFacts = facts.filter((fact) => fact.component_id === repositoryId || fact.component_id.startsWith(`${repositoryId}:`));
    const serviceRootPortable = serviceDocumentPath(snapshot);
    const serviceRoot = join(root, ...serviceRootPortable.split("/"));
    await mkdir(join(serviceRoot, "flujos"), { recursive: true });
    await mkdir(join(serviceRoot, "diagramas"), { recursive: true });
    const serviceFlows = createServiceFlows(repositoryId, serviceRootPortable, serviceFacts, graph);
    allFlows.push(...serviceFlows);
    const architecture = renderServiceArchitecture(repositoryId, serviceFacts, graph, facts);
    await atomicWrite(join(serviceRoot, "diagramas", "arquitectura.md"), `# Arquitectura de ${repositoryId}\n\n> Vista resumida por responsabilidades observadas. Las líneas discontinuas representan relaciones candidatas o no resueltas.\n\n\`\`\`mermaid\n${architecture}\n\`\`\`\n\n${renderServiceRelations(repositoryId, graph, facts)}\n`);
    for (const flow of serviceFlows) await atomicWrite(join(root, ...flow.path.split("/")), renderFlowDocument(flow, repositoryId));
    await atomicWrite(join(serviceRoot, "servicio.md"), `${renderDocument(serviceModel)}\n${renderServiceVisualIndex(repositoryId, architecture, serviceFlows, graph, facts)}\n`);
  }
  await mkdir(join(root, "Mapas"), { recursive: true });
  await atomicWrite(join(root, "Mapas", "relaciones.md"), `# Arquitectura general\n\n> Diagrama arquitectónico generado de forma determinista bajo el contrato de la skill \`archify-documentation\`. Archify externo solo se considera ejecutado cuando existe un adaptador registrado.\n\n\`\`\`mermaid\n${renderRelationshipMermaid(model)}\n\`\`\`\n\n${renderGraphTable(graph)}\n`);
  await atomicWrite(join(root, "Mapas", "microservicios.md"), renderMicroserviceDocument(graph, facts));
  await mkdir(join(root, "Flujos"), { recursive: true });
  await atomicWrite(join(root, "Flujos", "end-to-end.md"), renderEndToEnd(graph, facts, allFlows));
}

function createServiceFlows(repositoryId: string, serviceRoot: string, facts: readonly Fact[], graph: KnowledgeGraph): ServiceFlow[] {
  const internal = moduleEdges(facts);
  const counters = new Map<string, number>();
  const incoming: FlowPoint[] = resolveEndpointFacts(facts).filter((endpoint) => endpoint.component === repositoryId).map((endpoint) => ({ ...endpoint, direction: "entrada", transport: "servidor HTTP", target: repositoryId }));
  const outgoing: FlowPoint[] = facts.filter((fact) => fact.kind === "http_client_call").map((fact) => {
    const value = asRecord(fact.value), edge = graph.edges.find((item) => item.type === "calls_http" && item.fact_ids.includes(fact.id));
    const targetNode = edge ? graph.nodes.find((node) => node.id === edge.to) : undefined;
    return {
      component: repositoryId,
      method: String(value.method ?? "UNKNOWN"),
      path: String(value.path_expression ?? value.base_url ?? value.target ?? "destino no resuelto"),
      handler: String(value.library ?? "cliente HTTP"),
      source_path: String(value.source_path ?? "Desconocido"),
      status: edge?.status ?? (value.resolved === true ? "supported" : "unresolved"),
      evidence: fact.evidence_ids.join(", "),
      direction: "salida",
      transport: String(value.library ?? "cliente HTTP"),
      target: targetNode?.label ?? String(value.target ?? "destino no resuelto")
    };
  });
  return [...incoming, ...outgoing].map((endpoint) => {
    const base = flowSlug(endpoint);
    const count = (counters.get(base) ?? 0) + 1; counters.set(base, count);
    const slug = count === 1 ? base : `${base}-${count}`;
    return { endpoint, slug, path: `${serviceRoot}/flujos/${slug}.md`, module_edges: reachableModuleEdges(repositoryId, endpoint.source_path, internal) };
  });
}

function renderServiceVisualIndex(repositoryId: string, architecture: string, flows: readonly ServiceFlow[], graph: KnowledgeGraph, facts: readonly Fact[]): string {
  const flowLinks = flows.length > 0 ? flows.map((flow) => `- [[flujos/${flow.slug}|${flow.endpoint.direction} · ${flow.endpoint.method} ${flow.endpoint.path}]] — \`${flow.endpoint.handler}\``).join("\n") : "- No se detectaron entradas ni llamadas HTTP salientes.";
  return [`## Diagramas del servicio`, "", `[[diagramas/arquitectura|Abrir arquitectura de ${repositoryId}]]`, "", "```mermaid", architecture, "```", "", "## Flujos HTTP documentados", "", flowLinks, "", "## Relaciones con otros servicios", "", renderServiceRelations(repositoryId, graph, facts), ""].join("\n");
}

function renderServiceArchitecture(repositoryId: string, facts: readonly Fact[], graph: KnowledgeGraph, allFacts: readonly Fact[]): string {
  const modules = facts.filter((fact) => fact.kind === "source_module");
  const groups = new Map<string, number>();
  for (const fact of modules) { const value = asRecord(fact.value), role = String(value.role ?? value.layer ?? "module"); groups.set(role, (groups.get(role) ?? 0) + 1); }
  const lines = ["flowchart LR", `  service["${escapeMermaid(repositoryId)}"]`];
  let counter = 0;
  for (const [role, count] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) { const id = `role${counter++}`; lines.push(`  service --> ${id}["${escapeMermaid(role)} · ${count} módulo(s)"]`); }
  const componentId = `component:${repositoryId}`;
  for (const edge of graph.edges.filter((item) => item.type === "calls_http" && (item.from === componentId || item.to === componentId))) {
    const otherId = edge.from === componentId ? edge.to : edge.from, other = graph.nodes.find((node) => node.id === otherId)?.label ?? otherId;
    const relation = relationLabel(edge, allFacts), id = `rel${counter++}`, arrow = edge.status === "supported" ? "-->" : "-.->";
    lines.push(`  ${id}["${escapeMermaid(other)}"]`);
    lines.push(edge.from === componentId ? `  service ${arrow}|"${escapeMermaid(relation)}"| ${id}` : `  ${id} ${arrow}|"${escapeMermaid(relation)}"| service`);
  }
  if (groups.size === 0 && lines.length === 2) lines.push("  service --> empty[\"Sin módulos extraídos\"]");
  return lines.join("\n");
}

function renderFlowDocument(flow: ServiceFlow, repositoryId: string): string {
  const endpoint = flow.endpoint;
  return [`# ${endpoint.direction === "entrada" ? "Entrada" : "Salida"} ${endpoint.method} ${endpoint.path}`, "", `Servicio: **${repositoryId}**  `, `Dirección: **${endpoint.direction}**  `, `${endpoint.direction === "entrada" ? "Handler" : "Cliente"} observado: \`${endpoint.handler}\`  `, `Destino correlacionado: **${endpoint.target}**  `, `Estado: **${endpoint.status}**  `, `Archivo de origen: \`${endpoint.source_path}\``, "", "> El diagrama representa dependencias/imports estáticos alcanzables desde el punto observado. No es telemetría ni garantiza el orden de ejecución.", "", "## Diagrama del flujo", "", "```mermaid", renderEndpointMermaid(flow), "```", "", "## Módulos alcanzables", "", "| Origen | Destino | Símbolos importados |", "|---|---|---|", ...(flow.module_edges.length > 0 ? flow.module_edges.map((edge) => `| ${cell(edge.from)} | ${cell(edge.to)} | ${cell(edge.imports.join(", ") || "import lateral")} |`) : [`| ${cell(endpoint.source_path)} | No detectado | No detectado |`]), "", "## Evidencia", "", endpoint.evidence, "", "[[../servicio|Volver al servicio]]", ""].join("\n");
}

function renderEndpointMermaid(flow: ServiceFlow): string {
  const ids = new Map<string, string>(), lines = ["flowchart LR"], id = (path: string) => { let value = ids.get(path); if (!value) { value = `m${ids.size}`; ids.set(path, value); } return value; };
  if (flow.endpoint.direction === "entrada") {
    lines.push(`  endpoint["${escapeMermaid(`${flow.endpoint.method} ${flow.endpoint.path}`)}"] --> handler["${escapeMermaid(flow.endpoint.handler)}"]`);
    lines.push(`  handler --> ${id(flow.endpoint.source_path)}["${escapeMermaid(flow.endpoint.source_path)}"]`);
  } else {
    lines.push(`  ${id(flow.endpoint.source_path)}["${escapeMermaid(flow.endpoint.source_path)}"] --> client["${escapeMermaid(flow.endpoint.transport)}"]`);
    lines.push(`  client -->|"${escapeMermaid(`${flow.endpoint.method} ${flow.endpoint.path}`)}"| target["${escapeMermaid(flow.endpoint.target)}"]`);
  }
  for (const edge of flow.module_edges) lines.push(`  ${id(edge.from)}["${escapeMermaid(edge.from)}"] -->|"importa ${escapeMermaid(edge.imports.join(", "))}"| ${id(edge.to)}["${escapeMermaid(edge.to)}"]`);
  return lines.join("\n");
}

function renderEndToEnd(graph: KnowledgeGraph, facts: readonly Fact[], flows: readonly ServiceFlow[]): string {
  const grouped = new Map<string, ServiceFlow[]>();
  for (const flow of flows) grouped.set(flow.endpoint.component, [...(grouped.get(flow.endpoint.component) ?? []), flow]);
  const lines = ["# Flujos extremo a extremo", "", "Cada endpoint enlaza su propio Markdown con diagrama Mermaid. Las relaciones entre servicios proceden del grafo correlacionado y conservan su estado.", ""];
  for (const [service, items] of grouped) { lines.push(`## ${service}`, ""); for (const flow of items) lines.push(`- [[${flow.path.replace(/\.md$/u, "")}|${flow.endpoint.direction} · ${flow.endpoint.method} ${flow.endpoint.path}]] — ${flow.endpoint.handler} — **${flow.endpoint.status}**`); lines.push(""); }
  lines.push("## Mapa de consumo entre servicios", "", "[[../Mapas/microservicios|Abrir mapa detallado de microservicios]]", "", "```mermaid", renderMicroserviceMermaid(graph, facts), "```", "");
  return lines.join("\n");
}

function renderMicroserviceDocument(graph: KnowledgeGraph, facts: readonly Fact[]): string {
  const edges = graph.edges.filter((edge) => edge.type === "calls_http");
  const label = (id: string) => graph.nodes.find((node) => node.id === id)?.label ?? id;
  return ["# Relaciones entre microservicios y sistemas externos", "", "> Las flechas continuas están respaldadas; las discontinuas son candidatas o no resueltas. Una variable de URL sin alias conserva un nodo externo explícito.", "", "```mermaid", renderMicroserviceMermaid(graph, facts), "```", "", "| Consumidor | Llamada observada | Destino | Estado | Evidencia | Limitaciones |", "|---|---|---|---|---|---|", ...edges.map((edge) => `| ${cell(label(edge.from))} | ${cell(relationLabel(edge, facts))} | ${cell(label(edge.to))} | ${edge.status} | ${cell(edge.evidence_ids.join(", "))} | ${cell(edge.limitations.join("; ") || "Sin limitaciones adicionales")} |`), ""].join("\n");
}

function renderMicroserviceMermaid(graph: KnowledgeGraph, facts: readonly Fact[]): string {
  const edges = graph.edges.filter((edge) => edge.type === "calls_http");
  if (edges.length === 0) return "flowchart LR\n  empty[\"Sin llamadas HTTP detectadas\"]";
  const ids = new Map<string, string>(), label = (nodeId: string) => graph.nodes.find((node) => node.id === nodeId)?.label ?? nodeId, id = (nodeId: string) => { let value = ids.get(nodeId); if (!value) { value = `s${ids.size}`; ids.set(nodeId, value); } return value; };
  const lines = ["flowchart LR"], seen = new Set<string>();
  for (const edge of edges) { const key = `${edge.from}\u0000${edge.to}\u0000${relationLabel(edge, facts)}\u0000${edge.status}`; if (seen.has(key)) continue; seen.add(key); const arrow = edge.status === "supported" ? "-->" : "-.->"; lines.push(`  ${id(edge.from)}["${escapeMermaid(label(edge.from))}"] ${arrow}|"${escapeMermaid(relationLabel(edge, facts))}"| ${id(edge.to)}["${escapeMermaid(label(edge.to))}"]`); }
  return lines.join("\n");
}

function renderServiceRelations(repositoryId: string, graph: KnowledgeGraph, facts: readonly Fact[]): string {
  const componentId = `component:${repositoryId}`, edges = graph.edges.filter((edge) => edge.type === "calls_http" && (edge.from === componentId || edge.to === componentId));
  if (edges.length === 0) return "No se detectaron relaciones HTTP entrantes o salientes para este servicio.";
  const label = (id: string) => graph.nodes.find((node) => node.id === id)?.label ?? id;
  return ["| Dirección | Otro sistema | Llamada | Estado | Limitaciones |", "|---|---|---|---|---|", ...edges.map((edge) => `| ${edge.from === componentId ? "saliente" : "entrante"} | ${cell(label(edge.from === componentId ? edge.to : edge.from))} | ${cell(relationLabel(edge, facts))} | ${edge.status} | ${cell(edge.limitations.join("; ") || "Sin limitaciones adicionales")} |`)].join("\n");
}

function relationLabel(edge: GraphEdge, facts: readonly Fact[]): string {
  const fact = edge.fact_ids.map((factId) => facts.find((item) => item.id === factId)).find(Boolean), value = asRecord(fact?.value);
  return `${String(value.method ?? "UNKNOWN")} ${String(value.path_expression ?? value.base_url ?? value.target ?? "destino no resuelto")} · ${edge.status}`;
}

function moduleEdges(facts: readonly Fact[]): Map<string, ModuleEdge[]> {
  const result = new Map<string, ModuleEdge[]>();
  for (const fact of facts.filter((item) => item.kind === "module_dependency")) { const value = asRecord(fact.value); if (value.external !== false || typeof value.source_path !== "string" || typeof value.target_path !== "string") continue; const key = `${fact.component_id}\u0000${value.source_path}`, edge = { from: value.source_path, to: value.target_path, imports: Array.isArray(value.imports) ? value.imports.map(String) : [] }; result.set(key, [...(result.get(key) ?? []), edge]); }
  return result;
}

function reachableModuleEdges(component: string, start: string, graph: ReadonlyMap<string, ModuleEdge[]>, maxDepth = 4, maxEdges = 30): ModuleEdge[] {
  const result: ModuleEdge[] = [], seenNodes = new Set([start]), seenEdges = new Set<string>(), queue: Array<{ path: string; depth: number }> = [{ path: start, depth: 0 }];
  while (queue.length > 0 && result.length < maxEdges) { const current = queue.shift()!; if (current.depth >= maxDepth) continue; for (const edge of graph.get(`${component}\u0000${current.path}`) ?? []) { const key = `${edge.from}\u0000${edge.to}`; if (!seenEdges.has(key)) { seenEdges.add(key); result.push(edge); } if (!seenNodes.has(edge.to)) { seenNodes.add(edge.to); queue.push({ path: edge.to, depth: current.depth + 1 }); } } }
  return result;
}

function flowSlug(endpoint: FlowPoint): string { const prefix = endpoint.direction === "salida" ? "salida-" : ""; return `${prefix}${endpoint.method}-${endpoint.path}`.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "endpoint"; }
function asRecord(value: unknown): Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function escapeMermaid(value: string): string { return value.replace(/["\r\n<>]/gu, " ").replace(/\|/gu, "/").trim(); }
function cell(value: string): string { return value.replaceAll("|", "\\|").replace(/[\r\n]/gu, " "); }
