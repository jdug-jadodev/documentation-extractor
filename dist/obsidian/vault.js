import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { atomicWrite } from "../platform/fs.js";
import { renderDocument } from "../documentation/render.js";
import { renderEditionIndex, renderGraphTable, serviceDocumentPath } from "./navigation.js";
import { resolveEndpointFacts } from "../documentation/model.js";
export async function buildCandidateVault(root, model, graph, serviceModels = new Map(), facts = [], profileOverrides = {}) {
    await mkdir(root, { recursive: true });
    const allFlows = [];
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
        const architecture = renderServiceArchitecture(repositoryId, serviceFacts, graph, facts, profileOverrides);
        await atomicWrite(join(serviceRoot, "diagramas", "arquitectura.md"), `# Arquitectura de ${repositoryId}\n\n> El bloque principal delimita únicamente este repositorio. Los otros sistemas se muestran fuera del bloque: una flecha expresa consumo o integración, no propiedad. Las líneas discontinuas representan relaciones candidatas o no resueltas.\n\n\`\`\`mermaid\n${architecture}\n\`\`\`\n\n${renderServiceRelations(repositoryId, graph, facts, profileOverrides)}\n`);
        for (const flow of serviceFlows)
            await atomicWrite(join(root, ...flow.path.split("/")), renderFlowDocument(flow, repositoryId));
        await atomicWrite(join(serviceRoot, "servicio.md"), `${renderDocument(serviceModel)}\n${renderServiceVisualIndex(repositoryId, architecture, serviceFlows, graph, facts, profileOverrides)}\n`);
    }
    await mkdir(join(root, "Mapas"), { recursive: true });
    await atomicWrite(join(root, "Mapas", "relaciones.md"), `# Arquitectura general\n\n> Cada repositorio se representa como un sistema independiente. Las flechas expresan consumo o integración, nunca propiedad ni contención.\n\n\`\`\`mermaid\n${renderMicroserviceMermaid(graph, facts, profileOverrides)}\n\`\`\`\n\n${renderGraphTable(graph)}\n`);
    await atomicWrite(join(root, "Mapas", "microservicios.md"), renderMicroserviceDocument(graph, facts, profileOverrides));
    await mkdir(join(root, "Flujos"), { recursive: true });
    await atomicWrite(join(root, "Flujos", "end-to-end.md"), renderEndToEnd(graph, facts, allFlows, profileOverrides));
}
function createServiceFlows(repositoryId, serviceRoot, facts, graph) {
    const internal = moduleEdges(facts);
    const counters = new Map();
    const incoming = resolveEndpointFacts(facts).filter((endpoint) => endpoint.component === repositoryId).map((endpoint) => ({ ...endpoint, direction: "entrada", transport: "servidor HTTP", target: repositoryId }));
    const outgoing = facts.filter((fact) => fact.kind === "http_client_call").map((fact) => {
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
        const count = (counters.get(base) ?? 0) + 1;
        counters.set(base, count);
        const slug = count === 1 ? base : `${base}-${count}`;
        return { endpoint, slug, path: `${serviceRoot}/flujos/${slug}.md`, module_edges: reachableModuleEdges(repositoryId, endpoint.source_path, internal) };
    });
}
function renderServiceVisualIndex(repositoryId, architecture, flows, graph, facts, profileOverrides) {
    const flowLinks = flows.length > 0 ? flows.map((flow) => `- [[flujos/${flow.slug}|${flow.endpoint.direction} · ${flow.endpoint.method} ${flow.endpoint.path}]] — \`${flow.endpoint.handler}\``).join("\n") : "- No se detectaron entradas ni llamadas HTTP salientes.";
    return [`## Diagramas del servicio`, "", `[[diagramas/arquitectura|Abrir arquitectura de ${repositoryId}]]`, "", "```mermaid", architecture, "```", "", "## Flujos HTTP documentados", "", flowLinks, "", "## Relaciones con otros servicios", "", renderServiceRelations(repositoryId, graph, facts, profileOverrides), ""].join("\n");
}
function renderServiceArchitecture(repositoryId, facts, graph, allFacts, profileOverrides) {
    const modules = facts.filter((fact) => fact.kind === "source_module");
    const groups = new Map();
    for (const fact of modules) {
        const value = asRecord(fact.value), role = String(value.role ?? value.layer ?? "module");
        groups.set(role, (groups.get(role) ?? 0) + 1);
    }
    const profile = repositoryProfile(repositoryId, allFacts, profileOverrides);
    const boundaryLabel = `${profile.type_label} · ${profile.label}${profile.domain === null ? "" : ` · Dominio: ${profile.domain}`}`;
    const lines = ["flowchart LR", `  subgraph boundary["${escapeMermaid(boundaryLabel)}"]`, "    direction TB", `    service["${escapeMermaid(profile.label)}"]`];
    let counter = 0;
    for (const [role, count] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const id = `role${counter++}`;
        lines.push(`    service --> ${id}["${escapeMermaid(role)} · ${count} módulo(s)"]`);
    }
    if (groups.size === 0)
        lines.push("    service --> empty[\"Sin módulos extraídos\"]");
    lines.push("  end");
    const componentId = `component:${repositoryId}`;
    for (const edge of graph.edges.filter((item) => item.type === "calls_http" && (item.from === componentId || item.to === componentId))) {
        const otherId = edge.from === componentId ? edge.to : edge.from;
        const otherNode = graph.nodes.find((node) => node.id === otherId);
        const otherRepositoryId = otherId.startsWith("component:") ? otherId.slice("component:".length) : null;
        const otherProfile = otherRepositoryId === null ? null : repositoryProfile(otherRepositoryId, allFacts, profileOverrides);
        const other = otherProfile === null
            ? `${otherNode?.label ?? otherId} · Sistema externo`
            : `${otherProfile.label} · ${otherProfile.type_label}${otherProfile.domain === null ? "" : ` · Dominio: ${otherProfile.domain}`}`;
        const relation = relationLabel(edge, allFacts), id = `rel${counter++}`, arrow = edge.status === "supported" ? "-->" : "-.->";
        lines.push(`  ${id}["${escapeMermaid(other)}"]`);
        lines.push(edge.from === componentId ? `  service ${arrow}|"${escapeMermaid(relation)}"| ${id}` : `  ${id} ${arrow}|"${escapeMermaid(relation)}"| service`);
    }
    return lines.join("\n");
}
function renderFlowDocument(flow, repositoryId) {
    const endpoint = flow.endpoint;
    return [`# ${endpoint.direction === "entrada" ? "Entrada" : "Salida"} ${endpoint.method} ${endpoint.path}`, "", `Servicio: **${repositoryId}**  `, `Dirección: **${endpoint.direction}**  `, `${endpoint.direction === "entrada" ? "Handler" : "Cliente"} observado: \`${endpoint.handler}\`  `, `Destino correlacionado: **${endpoint.target}**  `, `Estado: **${endpoint.status}**  `, `Archivo de origen: \`${endpoint.source_path}\``, "", "> El diagrama representa dependencias/imports estáticos alcanzables desde el punto observado. No es telemetría ni garantiza el orden de ejecución.", "", "## Diagrama del flujo", "", "```mermaid", renderEndpointMermaid(flow), "```", "", "## Módulos alcanzables", "", "| Origen | Destino | Símbolos importados |", "|---|---|---|", ...(flow.module_edges.length > 0 ? flow.module_edges.map((edge) => `| ${cell(edge.from)} | ${cell(edge.to)} | ${cell(edge.imports.join(", ") || "import lateral")} |`) : [`| ${cell(endpoint.source_path)} | No detectado | No detectado |`]), "", "## Evidencia", "", endpoint.evidence, "", "[[../servicio|Volver al servicio]]", ""].join("\n");
}
function renderEndpointMermaid(flow) {
    const ids = new Map(), lines = ["flowchart LR"], id = (path) => { let value = ids.get(path); if (!value) {
        value = `m${ids.size}`;
        ids.set(path, value);
    } return value; };
    if (flow.endpoint.direction === "entrada") {
        lines.push(`  endpoint["${escapeMermaid(`${flow.endpoint.method} ${flow.endpoint.path}`)}"] --> handler["${escapeMermaid(flow.endpoint.handler)}"]`);
        lines.push(`  handler --> ${id(flow.endpoint.source_path)}["${escapeMermaid(flow.endpoint.source_path)}"]`);
    }
    else {
        lines.push(`  ${id(flow.endpoint.source_path)}["${escapeMermaid(flow.endpoint.source_path)}"] --> client["${escapeMermaid(flow.endpoint.transport)}"]`);
        lines.push(`  client -->|"${escapeMermaid(`${flow.endpoint.method} ${flow.endpoint.path}`)}"| target["${escapeMermaid(flow.endpoint.target)}"]`);
    }
    for (const edge of flow.module_edges)
        lines.push(`  ${id(edge.from)}["${escapeMermaid(edge.from)}"] -->|"importa ${escapeMermaid(edge.imports.join(", "))}"| ${id(edge.to)}["${escapeMermaid(edge.to)}"]`);
    return lines.join("\n");
}
function renderEndToEnd(graph, facts, flows, profileOverrides) {
    const grouped = new Map();
    for (const flow of flows)
        grouped.set(flow.endpoint.component, [...(grouped.get(flow.endpoint.component) ?? []), flow]);
    const lines = ["# Flujos extremo a extremo", "", "Cada endpoint enlaza su propio Markdown con diagrama Mermaid. Las relaciones entre servicios proceden del grafo correlacionado y conservan su estado.", ""];
    for (const [service, items] of grouped) {
        lines.push(`## ${service}`, "");
        for (const flow of items)
            lines.push(`- [[${flow.path.replace(/\.md$/u, "")}|${flow.endpoint.direction} · ${flow.endpoint.method} ${flow.endpoint.path}]] — ${flow.endpoint.handler} — **${flow.endpoint.status}**`);
        lines.push("");
    }
    lines.push("## Mapa de consumo entre sistemas", "", "> Cada repositorio es un sistema independiente; las flechas indican quién consume a quién.", "", "[[../Mapas/microservicios|Abrir mapa detallado de sistemas]]", "", "```mermaid", renderMicroserviceMermaid(graph, facts, profileOverrides), "```", "");
    return lines.join("\n");
}
function renderMicroserviceDocument(graph, facts, profileOverrides) {
    const edges = graph.edges.filter((edge) => edge.type === "calls_http");
    const label = (id) => graph.nodes.find((node) => node.id === id)?.label ?? id;
    return ["# Relaciones entre sistemas independientes", "", "> Cada repositorio conserva su propio límite. Las flechas continuas están respaldadas; las discontinuas son candidatas o no resueltas. Una variable de URL sin alias conserva un nodo externo explícito.", "", "```mermaid", renderMicroserviceMermaid(graph, facts, profileOverrides), "```", "", "| Consumidor | Llamada observada | Destino | Estado | Evidencia | Limitaciones |", "|---|---|---|---|---|---|", ...edges.map((edge) => `| ${cell(label(edge.from))} | ${cell(relationLabel(edge, facts))} | ${cell(label(edge.to))} | ${edge.status} | ${cell(edge.evidence_ids.join(", "))} | ${cell(edge.limitations.join("; ") || "Sin limitaciones adicionales")} |`), ""].join("\n");
}
function renderMicroserviceMermaid(graph, facts, profileOverrides) {
    const edges = graph.edges.filter((edge) => edge.type === "calls_http");
    const componentNodes = graph.nodes.filter((node) => node.type === "component");
    if (componentNodes.length === 0 && edges.length === 0)
        return "flowchart LR\n  empty[\"Sin sistemas ni llamadas HTTP detectadas\"]";
    const ids = new Map(), id = (nodeId) => { let value = ids.get(nodeId); if (!value) {
        value = `s${ids.size}`;
        ids.set(nodeId, value);
    } return value; };
    const lines = ["flowchart LR"];
    const grouped = new Map([
        ["clients", []], ["services", []], ["components", []]
    ]);
    for (const node of componentNodes) {
        const repositoryId = node.id.startsWith("component:") ? node.id.slice("component:".length) : node.label;
        const profile = repositoryProfile(repositoryId, facts, profileOverrides);
        grouped.get(profile.group).push({ nodeId: node.id, profile });
    }
    const groupLabels = { clients: "Aplicaciones cliente independientes", services: "Microservicios y APIs independientes", components: "Otros sistemas independientes" };
    for (const group of ["clients", "services", "components"]) {
        const items = grouped.get(group);
        if (items.length === 0)
            continue;
        lines.push(`  subgraph ${group}["${groupLabels[group]}"]`, "    direction TB");
        for (const item of items.sort((a, b) => a.profile.label.localeCompare(b.profile.label))) {
            const nodeLabel = `${item.profile.label} · ${item.profile.type_label}${item.profile.domain === null ? "" : ` · Dominio: ${item.profile.domain}`}`;
            lines.push(`    ${id(item.nodeId)}["${escapeMermaid(nodeLabel)}"]`);
        }
        lines.push("  end");
    }
    const externalNodeIds = new Set(edges.flatMap((edge) => [edge.from, edge.to]).filter((nodeId) => !nodeId.startsWith("component:")));
    if (externalNodeIds.size > 0) {
        lines.push('  subgraph externals["Sistemas externos o destinos no resueltos"]', "    direction TB");
        for (const nodeId of [...externalNodeIds].sort()) {
            const nodeLabel = graph.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
            lines.push(`    ${id(nodeId)}["${escapeMermaid(nodeLabel)}"]`);
        }
        lines.push("  end");
    }
    const seen = new Set();
    for (const edge of edges) {
        const key = `${edge.from}\u0000${edge.to}\u0000${relationLabel(edge, facts)}\u0000${edge.status}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        const arrow = edge.status === "supported" ? "-->" : "-.->";
        lines.push(`  ${id(edge.from)} ${arrow}|"${escapeMermaid(relationLabel(edge, facts))}"| ${id(edge.to)}`);
    }
    return lines.join("\n");
}
function renderServiceRelations(repositoryId, graph, facts, profileOverrides) {
    const componentId = `component:${repositoryId}`, edges = graph.edges.filter((edge) => edge.type === "calls_http" && (edge.from === componentId || edge.to === componentId));
    if (edges.length === 0)
        return "No se detectaron relaciones HTTP entrantes o salientes para este servicio.";
    const label = (id) => graph.nodes.find((node) => node.id === id)?.label ?? id;
    const otherType = (nodeId) => nodeId.startsWith("component:") ? repositoryProfile(nodeId.slice("component:".length), facts, profileOverrides).type_label : "Sistema externo";
    return ["| Dirección | Otro sistema independiente | Tipo | Llamada | Estado | Limitaciones |", "|---|---|---|---|---|---|", ...edges.map((edge) => { const otherId = edge.from === componentId ? edge.to : edge.from; return `| ${edge.from === componentId ? "saliente" : "entrante"} | ${cell(label(otherId))} | ${cell(otherType(otherId))} | ${cell(relationLabel(edge, facts))} | ${edge.status} | ${cell(edge.limitations.join("; ") || "Sin limitaciones adicionales")} |`; })].join("\n");
}
function repositoryProfile(repositoryId, facts, overrides) {
    const override = overrides[repositoryId] ?? {};
    const repositoryFacts = facts.filter((fact) => fact.component_id === repositoryId || fact.component_id.startsWith(`${repositoryId}:`));
    const explicitType = override.type?.trim().toLocaleLowerCase("en-US").replace(/[ -]+/gu, "_");
    let group;
    let typeLabel;
    if (explicitType === "mobile_application" || explicitType === "mobile_app") {
        group = "clients";
        typeLabel = "Aplicación móvil";
    }
    else if (explicitType === "web_application" || explicitType === "web_app") {
        group = "clients";
        typeLabel = "Aplicación web";
    }
    else if (explicitType === "client_application" || explicitType === "client") {
        group = "clients";
        typeLabel = "Aplicación cliente";
    }
    else if (explicitType === "microservice" || explicitType === "microservicio") {
        group = "services";
        typeLabel = "Microservicio independiente";
    }
    else if (explicitType === "service" || explicitType === "api") {
        group = "services";
        typeLabel = "Servicio/API independiente";
    }
    else if (explicitType === "library" || explicitType === "biblioteca") {
        group = "components";
        typeLabel = "Biblioteca independiente";
    }
    else {
        const isMobile = repositoryFacts.some((fact) => fact.kind === "package_dependency" && /^(react-native|expo)$/u.test(String(asRecord(fact.value).package ?? asRecord(fact.value).name ?? "")));
        const isClient = isMobile || repositoryFacts.some((fact) => fact.kind === "ui_route" || fact.kind === "ui_component");
        const exposesHttp = repositoryFacts.some((fact) => fact.kind === "http_endpoint" || fact.kind === "http_endpoint_fragment");
        if (isMobile) {
            group = "clients";
            typeLabel = "Aplicación móvil inferida";
        }
        else if (isClient && !exposesHttp) {
            group = "clients";
            typeLabel = "Aplicación cliente inferida";
        }
        else if (exposesHttp && !isClient) {
            group = "services";
            typeLabel = "Servicio/API inferido";
        }
        else {
            group = "components";
            typeLabel = "Sistema independiente";
        }
    }
    return { id: repositoryId, label: override.label?.trim() || repositoryId, domain: override.domain?.trim() || null, group, type_label: typeLabel };
}
function relationLabel(edge, facts) {
    const fact = edge.fact_ids.map((factId) => facts.find((item) => item.id === factId)).find(Boolean), value = asRecord(fact?.value);
    return `${String(value.method ?? "UNKNOWN")} ${String(value.path_expression ?? value.base_url ?? value.target ?? "destino no resuelto")} · ${edge.status}`;
}
function moduleEdges(facts) {
    const result = new Map();
    for (const fact of facts.filter((item) => item.kind === "module_dependency")) {
        const value = asRecord(fact.value);
        if (value.external !== false || typeof value.source_path !== "string" || typeof value.target_path !== "string")
            continue;
        const key = `${fact.component_id}\u0000${value.source_path}`, edge = { from: value.source_path, to: value.target_path, imports: Array.isArray(value.imports) ? value.imports.map(String) : [] };
        result.set(key, [...(result.get(key) ?? []), edge]);
    }
    return result;
}
function reachableModuleEdges(component, start, graph, maxDepth = 4, maxEdges = 30) {
    const result = [], seenNodes = new Set([start]), seenEdges = new Set(), queue = [{ path: start, depth: 0 }];
    while (queue.length > 0 && result.length < maxEdges) {
        const current = queue.shift();
        if (current.depth >= maxDepth)
            continue;
        for (const edge of graph.get(`${component}\u0000${current.path}`) ?? []) {
            const key = `${edge.from}\u0000${edge.to}`;
            if (!seenEdges.has(key)) {
                seenEdges.add(key);
                result.push(edge);
            }
            if (!seenNodes.has(edge.to)) {
                seenNodes.add(edge.to);
                queue.push({ path: edge.to, depth: current.depth + 1 });
            }
        }
    }
    return result;
}
function flowSlug(endpoint) { const prefix = endpoint.direction === "salida" ? "salida-" : ""; return `${prefix}${endpoint.method}-${endpoint.path}`.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "endpoint"; }
function asRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function escapeMermaid(value) { return value.replace(/["\r\n<>]/gu, " ").replace(/\|/gu, "/").trim(); }
function cell(value) { return value.replaceAll("|", "\\|").replace(/[\r\n]/gu, " "); }
//# sourceMappingURL=vault.js.map