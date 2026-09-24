import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { atomicWrite } from "../platform/fs.js";
import { stableId } from "../platform/hash.js";
import { renderDocument } from "../documentation/render.js";
import { renderEditionIndex, renderGraphTable, serviceDocumentPath } from "./navigation.js";
import { resolveEndpointFacts } from "../documentation/model.js";
import { semanticFlows, traceEndpointFlow } from "../documentation/semantic.js";
import { graphForFacts, productionFacts } from "../documentation/source_scope.js";
export async function buildCandidateVault(root, model, graph, serviceModels = new Map(), facts = [], profileOverrides = {}) {
    facts = productionFacts(facts);
    graph = graphForFacts(graph, facts);
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
        await mkdir(join(serviceRoot, "clases"), { recursive: true });
        await mkdir(join(serviceRoot, "metodos"), { recursive: true });
        const serviceFlows = createServiceFlows(repositoryId, serviceRootPortable, serviceFacts, graph);
        allFlows.push(...serviceFlows);
        const architecture = renderServiceArchitecture(repositoryId, serviceFacts, graph, facts, profileOverrides);
        await atomicWrite(join(serviceRoot, "diagramas", "arquitectura.md"), `# Arquitectura de ${repositoryId}\n\n> El bloque principal delimita únicamente este repositorio. Los otros sistemas se muestran fuera del bloque: una flecha expresa consumo o integración, no propiedad. Las líneas discontinuas representan relaciones candidatas o no resueltas.\n\n\`\`\`mermaid\n${architecture}\n\`\`\`\n\n${renderServiceRelations(repositoryId, graph, facts, profileOverrides)}\n`);
        await atomicWrite(join(serviceRoot, "diagramas", "estructura.md"), renderRepositoryStructure(repositoryId, serviceFacts));
        await atomicWrite(join(serviceRoot, "diagramas", "modulos.md"), renderBuildModules(repositoryId, serviceFacts));
        await atomicWrite(join(serviceRoot, "diagramas", "capas.md"), renderLayers(repositoryId, serviceFacts));
        await atomicWrite(join(serviceRoot, "diagramas", "routers.md"), renderRouters(repositoryId, serviceFacts));
        for (const flow of serviceFlows)
            await atomicWrite(join(root, ...flow.path.split("/")), renderFlowDocument(flow, repositoryId));
        const symbolIndex = await writeSymbolPages(serviceRoot, serviceRootPortable, repositoryId, serviceFacts);
        await atomicWrite(join(serviceRoot, "servicio.md"), `${renderDocument(serviceModel)}\n${renderServiceVisualIndex(repositoryId, architecture, serviceFlows, graph, facts, profileOverrides)}\n${symbolIndex}\n`);
    }
    await mkdir(join(root, "Mapas"), { recursive: true });
    await atomicWrite(join(root, "Mapas", "relaciones.md"), `# Arquitectura general\n\n> Cada repositorio se representa como un sistema independiente. Las flechas expresan consumo o integración, nunca propiedad ni contención.\n\n\`\`\`mermaid\n${renderMicroserviceMermaid(graph, facts, profileOverrides)}\n\`\`\`\n\n${renderGraphTable(graph)}\n`);
    await atomicWrite(join(root, "Mapas", "microservicios.md"), renderMicroserviceDocument(graph, facts, profileOverrides));
    await mkdir(join(root, "Flujos"), { recursive: true });
    await atomicWrite(join(root, "Flujos", "end-to-end.md"), renderEndToEnd(graph, facts, allFlows, profileOverrides));
}
/** Renders exactly one already-indexed HTTP flow; it never reads an application repository. */
export function renderScopedFlowDocumentation(repositoryId, method, path, facts) {
    const serviceFacts = productionFacts(facts).filter((fact) => fact.component_id === repositoryId || fact.component_id.startsWith(`${repositoryId}:`));
    const endpoint = resolveEndpointFacts(serviceFacts).find((item) => item.component === repositoryId && item.method.toUpperCase() === method.toUpperCase() && normalizeRoute(item.path) === normalizeRoute(path));
    if (endpoint === undefined)
        throw new Error(`No existe un flujo indexado para ${repositoryId} ${method.toUpperCase()} ${path}.`);
    const point = { ...endpoint, direction: "entrada", transport: "servidor HTTP", target: repositoryId };
    const flow = {
        endpoint: point,
        slug: flowSlug(point),
        path: "",
        module_edges: reachableModuleEdges(repositoryId, endpoint.source_path, moduleEdges(serviceFacts)),
        semantic: traceEndpointFlow(endpoint, serviceFacts),
    };
    return { method: endpoint.method, path: endpoint.path, handler: endpoint.handler, source_path: endpoint.source_path, slug: flow.slug, markdown: renderFlowDocument(flow, repositoryId) };
}
function createServiceFlows(repositoryId, serviceRoot, facts, graph) {
    const internal = moduleEdges(facts);
    const semanticByEndpoint = new Map(semanticFlows(repositoryId, facts).map((flow) => [`${flow.endpoint.method}\0${flow.endpoint.path}\0${flow.endpoint.source_path}`, flow]));
    const counters = new Map();
    const endpoints = resolveEndpointFacts(facts).filter((endpoint) => endpoint.component === repositoryId).map((endpoint) => ({ ...endpoint, direction: "entrada", transport: "servidor HTTP", target: repositoryId }));
    const incoming = [...endpoints, ...screenFlowPoints(repositoryId, facts)];
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
        const semantic = endpoint.direction === "entrada" ? semanticByEndpoint.get(`${endpoint.method}\0${endpoint.path}\0${endpoint.source_path}`) ?? traceEndpointFlow(endpoint, facts) : null;
        return { endpoint, slug, path: `${serviceRoot}/flujos/${slug}.md`, module_edges: reachableModuleEdges(repositoryId, endpoint.source_path, internal), semantic };
    });
}
function screenFlowPoints(repositoryId, facts) {
    const candidates = facts.filter((fact) => fact.kind === "ui_route" || fact.kind === "ui_component" || (fact.kind === "code_symbol" && asRecord(fact.value).role === "screen"));
    const seen = new Set(), result = [];
    for (const fact of candidates) {
        const value = asRecord(fact.value), handler = String(value.handler ?? value.component ?? value.name ?? value.screen ?? "pantalla"), sourcePath = String(value.source_path ?? value.path ?? "Desconocido");
        const label = String(value.route ?? value.route_name ?? value.path ?? value.name ?? handler), key = `${sourcePath}\0${handler}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push({ component: repositoryId, method: "UI", path: `pantalla/${label}`, handler, source_path: sourcePath, status: "entrada de interfaz observada", evidence: fact.evidence_ids.join(", "), direction: "entrada", transport: "interfaz de usuario", target: repositoryId });
    }
    return result;
}
async function writeSymbolPages(serviceRoot, serviceRootPortable, repositoryId, facts) {
    const entries = facts.filter((fact) => fact.kind === "code_symbol").map((fact) => ({ fact, symbol: semanticSymbol(fact) })).filter((item) => item.symbol !== null);
    const methodFiles = new Map();
    for (const { fact, symbol } of entries.filter((item) => ["method", "constructor", "function"].includes(item.symbol.symbol_type))) {
        const file = `${portableSlug(`${symbol.class_name ?? "funcion"}-${symbol.name}`)}-${stableId("method-page", repositoryId, symbol.id).slice(-10)}.md`;
        methodFiles.set(symbol.id, file);
        const outgoing = facts.filter((item) => item.kind === "symbol_call" && asRecord(item.value).caller_symbol_id === symbol.id).map((item) => asRecord(item.value));
        const incoming = facts.filter((item) => item.kind === "symbol_call" && asRecord(item.value).target_symbol_id === symbol.id).map((item) => asRecord(item.value));
        const calls = outgoing.length === 0 ? "- No se observaron llamadas salientes." : outgoing.map((call) => `- \`${String(call.expression ?? call.callee_name)}\` → **${String(call.resolution ?? "unresolved")}**${typeof call.target_path === "string" ? ` en \`${call.target_path}\`` : ""}`).join("\n");
        const calledBy = incoming.length === 0 ? "- No se encontraron llamadores dentro del repositorio." : incoming.map((call) => `- \`${String(call.caller_class ?? "función independiente")}.${String(call.caller_name ?? "desconocido")}\``).join("\n");
        const snippet = symbol.snippet === "" ? "Fragmento no disponible." : `\`\`\`${languageForSnippet(symbol.source_path)}\n${symbol.snippet}\n\`\`\``;
        await atomicWrite(join(serviceRoot, "metodos", file), [`# ${symbol.class_name === null ? "Función" : symbol.symbol_type === "constructor" ? "Constructor" : "Método"} ${symbol.class_name === null ? symbol.name : `${symbol.class_name}.${symbol.name}`}`, "", symbol.description, "", `- Firma: \`${cell(symbol.signature)}\``, `- Archivo: \`${symbol.source_path}\``, `- Líneas: ${symbol.start_line ?? "no disponible"}–${symbol.end_line ?? "no disponible"}`, `- Evidencia: ${fact.evidence_ids.join(", ")}`, "", "## Llamadas realizadas", "", calls, "", "## Llamado por", "", calledBy, "", "## Fragmento observado", "", snippet, "", "[[../servicio|Volver al servicio]]", ""].join("\n"));
    }
    const classEntries = entries.filter((item) => ["class", "interface", "record", "enum"].includes(item.symbol.symbol_type));
    const classLinks = [];
    for (const { fact, symbol } of classEntries) {
        const file = `${portableSlug(symbol.name)}-${stableId("class-page", repositoryId, symbol.id).slice(-10)}.md`;
        const methods = entries.filter((item) => item.symbol.class_name === symbol.name);
        const methodLinks = methods.length === 0 ? "- No se detectaron métodos." : methods.map((item) => `- [[../metodos/${(methodFiles.get(item.symbol.id) ?? "").replace(/\.md$/u, "")}|${item.symbol.name}]] — ${item.symbol.description}`).join("\n");
        const snippet = symbol.snippet === "" ? "Fragmento no disponible." : `\`\`\`${languageForSnippet(symbol.source_path)}\n${symbol.snippet}\n\`\`\``;
        await atomicWrite(join(serviceRoot, "clases", file), [`# ${symbol.symbol_type} ${symbol.name}`, "", symbol.description, "", `- Archivo: \`${symbol.source_path}\``, `- Líneas: ${symbol.start_line ?? "no disponible"}–${symbol.end_line ?? "no disponible"}`, `- Evidencia: ${fact.evidence_ids.join(", ")}`, "", "## Métodos", "", methodLinks, "", "## Fragmento observado", "", snippet, "", "[[../servicio|Volver al servicio]]", ""].join("\n"));
        classLinks.push(`- [[clases/${file.replace(/\.md$/u, "")}|${symbol.name}]] — ${methods.length} método(s)`);
    }
    const standalone = entries.filter((item) => item.symbol.class_name === null && item.symbol.symbol_type === "function").map((item) => `- [[metodos/${(methodFiles.get(item.symbol.id) ?? "").replace(/\.md$/u, "")}|${item.symbol.name}]] — ${item.symbol.description}`);
    return ["## Navegación por código", "", `Raíz documental: \`${serviceRootPortable}\``, "", "### Clases e interfaces", "", ...(classLinks.length > 0 ? classLinks : ["- No se detectaron clases o interfaces."]), "", "### Funciones independientes", "", ...(standalone.length > 0 ? standalone : ["- No se detectaron funciones independientes."]), ""].join("\n");
}
function renderServiceVisualIndex(repositoryId, architecture, flows, graph, facts, profileOverrides) {
    const flowLinks = flows.length > 0 ? flows.map((flow) => `- [[flujos/${flow.slug}|${flow.endpoint.direction} · ${flow.endpoint.method} ${flow.endpoint.path}]] — \`${flow.endpoint.handler}\``).join("\n") : "- No se detectaron endpoints, pantallas ni llamadas HTTP salientes.";
    return [`## Diagramas del servicio`, "", `- [[diagramas/arquitectura|Arquitectura semántica de ${repositoryId}]]`, `- [[diagramas/estructura|Árbol de carpetas y archivos de ${repositoryId}]]`, `- [[diagramas/modulos|Módulos de build]]`, `- [[diagramas/capas|Capas, roles y archivos]]`, `- [[diagramas/routers|Routers y endpoints]]`, "", "```mermaid", architecture, "```", "", "## Flujos documentados", "", flowLinks, "", "## Relaciones con otros servicios", "", renderServiceRelations(repositoryId, graph, facts, profileOverrides), ""].join("\n");
}
function renderServiceArchitecture(repositoryId, facts, graph, allFacts, profileOverrides) {
    const modules = facts.filter((fact) => fact.kind === "source_module" && asRecord(fact.value).source_set !== "test");
    const profile = repositoryProfile(repositoryId, allFacts, profileOverrides);
    const boundaryLabel = `${profile.type_label} · ${profile.label}${profile.domain === null ? "" : ` · Dominio: ${profile.domain}`}`;
    const symbolsByPath = new Map();
    for (const fact of facts.filter((item) => item.kind === "code_symbol")) {
        const value = asRecord(fact.value), path = String(value.source_path ?? ""), type = String(value.symbol_type ?? "");
        if (!["class", "interface", "record", "enum"].includes(type))
            continue;
        symbolsByPath.set(path, [...(symbolsByPath.get(path) ?? []), String(value.name ?? "")]);
    }
    const shown = modules.slice(0, 80), nodeByPath = new Map(), byLayer = new Map();
    for (const fact of shown) {
        const value = asRecord(fact.value), layerName = String(value.layer ?? "root");
        byLayer.set(layerName, [...(byLayer.get(layerName) ?? []), fact]);
    }
    const lines = ["flowchart TB", `  subgraph boundary["${escapeMermaid(boundaryLabel)}"]`, "    direction TB", `    service["${escapeMermaid(profile.label)}"]`];
    let counter = 0;
    for (const [layerName, layerFacts] of [...byLayer.entries()].sort(([a], [b]) => layerOrder(a) - layerOrder(b) || a.localeCompare(b))) {
        const layerId = `layer${counter++}`, firstNodes = [];
        lines.push(`    subgraph ${layerId}["Capa: ${escapeMermaid(layerName)}"]`, "      direction TB");
        const byRole = new Map();
        for (const fact of layerFacts) {
            const value = asRecord(fact.value), roleName = String(value.role ?? "module");
            byRole.set(roleName, [...(byRole.get(roleName) ?? []), fact]);
        }
        for (const [roleName, roleFacts] of [...byRole.entries()].sort(([a], [b]) => a.localeCompare(b))) {
            const roleId = `role${counter++}`;
            lines.push(`      subgraph ${roleId}["${escapeMermaid(roleName)}"]`, "        direction TB");
            for (const fact of roleFacts) {
                const value = asRecord(fact.value), path = String(value.path ?? value.source_path ?? "unknown"), nodeId = `file${counter++}`, classes = symbolsByPath.get(path) ?? [], label = `${path.split("/").at(-1) ?? path}${classes.length > 0 ? ` · ${classes.slice(0, 3).join(", ")}` : ""}`;
                nodeByPath.set(path, nodeId);
                firstNodes.push(nodeId);
                lines.push(`        ${nodeId}["${escapeMermaid(label)}"]`);
            }
            lines.push("      end");
        }
        lines.push("    end");
        if (firstNodes[0] !== undefined)
            lines.push(`    service --> ${firstNodes[0]}`);
    }
    if (modules.length === 0)
        lines.push("    service --> empty[\"Sin módulos extraídos\"]");
    if (modules.length > shown.length)
        lines.push(`    omitted["${modules.length - shown.length} archivos adicionales · ver árbol completo"]`, "    service -.-> omitted");
    lines.push("  end");
    for (const fact of facts.filter((item) => item.kind === "module_dependency")) {
        const value = asRecord(fact.value), from = nodeByPath.get(String(value.source_path ?? "")), to = nodeByPath.get(String(value.target_path ?? ""));
        if (from !== undefined && to !== undefined)
            lines.push(`  ${from} -->|importa| ${to}`);
    }
    const classPath = new Map();
    for (const [path, names] of symbolsByPath)
        for (const name of names)
            classPath.set(name, path);
    for (const fact of facts.filter((item) => item.kind === "dependency_injection")) {
        const value = asRecord(fact.value), fromPath = classPath.get(String(value.class_name ?? "")), targetType = simpleTypeName(String(value.dependency_type ?? "")), toPath = classPath.get(targetType), from = fromPath === undefined ? undefined : nodeByPath.get(fromPath), to = toPath === undefined ? undefined : nodeByPath.get(toPath);
        if (from !== undefined && to !== undefined && from !== to)
            lines.push(`  ${from} -->|inyecta ${escapeMermaid(targetType)}| ${to}`);
    }
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
    lines.push("  classDef service fill:#17324d,color:#fff,stroke:#5aa9e6,stroke-width:2px", "  classDef file fill:#f7fbff,color:#17202a,stroke:#7aa7c7", "  class service service");
    if (nodeByPath.size > 0)
        lines.push(`  class ${[...nodeByPath.values()].join(",")} file`);
    return lines.join("\n");
}
function renderRepositoryStructure(repositoryId, facts) {
    const files = facts.filter((fact) => fact.kind === "repository_file").map((fact) => String(asRecord(fact.value).path ?? "")).filter(Boolean).sort((a, b) => a.localeCompare(b));
    const sourceFiles = facts.filter((fact) => fact.kind === "source_module").map((fact) => asRecord(fact.value));
    const sourceSets = countValues(sourceFiles.map((value) => String(value.source_set ?? "root"))), buildModules = countValues(sourceFiles.map((value) => String(value.build_module ?? ".")));
    return [`# Estructura de ${repositoryId}`, "", "> Vista física separada de la arquitectura semántica. Incluye código productivo, recursos, manifiestos, configuración y documentación que entraron al análisis. Los archivos de prueba no se publican.", "", `Archivos documentables: **${files.length}**.`, "", "## Árbol", "", "```text", repositoryId, ...(files.length > 0 ? treeLines(files) : ["└── (sin archivos documentables)"]), "```", "", "## Source sets", "", "| Source set | Archivos fuente |", "|---|---:|", ...[...sourceSets.entries()].map(([name, count]) => `| ${cell(name)} | ${count} |`), "", "## Módulos de build", "", "| Módulo | Archivos fuente |", "|---|---:|", ...[...buildModules.entries()].map(([name, count]) => `| ${cell(name)} | ${count} |`), "", "[[../servicio|Volver al servicio]]", ""].join("\n");
}
function renderBuildModules(repositoryId, facts) {
    const sources = facts.filter((fact) => fact.kind === "source_module").map((fact) => asRecord(fact.value));
    const modules = countValues(sources.map((value) => String(value.build_module ?? ".")));
    const dependencies = facts.filter((fact) => fact.kind === "build_module_dependency").map((fact) => asRecord(fact.value));
    return [`# Módulos de build de ${repositoryId}`, "", "| Módulo | Fuentes de producción |", "|---|---:|", ...[...modules.entries()].map(([name, count]) => `| ${cell(name)} | ${count} |`), "", "## Dependencias declaradas", "", "| Origen | Destino | Manifiesto |", "|---|---|---|", ...(dependencies.length > 0 ? dependencies.map((value) => `| ${cell(String(value.source_module ?? "."))} | ${cell(String(value.target_module ?? "Desconocido"))} | ${cell(String(value.source_path ?? "Desconocido"))} |`) : ["| No detectado | No detectado | No detectado |"]), "", "[[../servicio|Volver al servicio]]", ""].join("\n");
}
function renderLayers(repositoryId, facts) {
    const modules = facts.filter((fact) => fact.kind === "source_module").map((fact) => asRecord(fact.value)).sort((a, b) => String(a.path ?? "").localeCompare(String(b.path ?? "")));
    return [`# Capas y roles de ${repositoryId}`, "", "| Capa | Rol | Source set | Módulo | Archivo | Puerto |", "|---|---|---|---|---|---|", ...modules.map((value) => `| ${cell(String(value.layer ?? "root"))} | ${cell(String(value.role ?? "module"))} | ${cell(String(value.source_set ?? "root"))} | ${cell(String(value.build_module ?? "."))} | ${cell(String(value.path ?? "Desconocido"))} | ${cell(String(value.port_direction ?? ""))} |`), "", "[[../servicio|Volver al servicio]]", ""].join("\n");
}
function renderRouters(repositoryId, facts) {
    const endpoints = facts.filter((fact) => fact.kind === "http_endpoint").map((fact) => asRecord(fact.value)).sort((a, b) => String(a.router_class ?? a.handler_class ?? "").localeCompare(String(b.router_class ?? b.handler_class ?? "")) || Number(a.route_order ?? 0) - Number(b.route_order ?? 0));
    return [`# Routers y endpoints de ${repositoryId}`, "", "| Router/controlador | Orden | Método | Ruta | Handler | Framework | Predicados | Filtros |", "|---|---:|---|---|---|---|---|---|", ...(endpoints.length > 0 ? endpoints.map((value) => `| ${cell(String(value.router_class ?? value.handler_class ?? "Desconocido"))} | ${cell(String(value.route_order ?? ""))} | ${cell(String(value.method ?? "UNKNOWN"))} | ${cell(String(value.path ?? "Desconocido"))} | ${cell(String(value.handler_expression ?? "Desconocido"))} | ${cell(String(value.framework ?? "Desconocido"))} | ${cell(Array.isArray(value.predicates) ? value.predicates.join(", ") : "")} | ${cell(Array.isArray(value.filters) ? value.filters.join(", ") : "")} |`) : ["| No detectado | | | | | | | |"]), "", "[[../servicio|Volver al servicio]]", ""].join("\n");
}
function renderFlowDocument(flow, repositoryId) {
    const endpoint = flow.endpoint;
    if (flow.semantic !== null)
        return renderSemanticFlowDocument(flow, repositoryId);
    return [`# ${endpoint.direction === "entrada" ? "Entrada" : "Salida"} ${endpoint.method} ${endpoint.path}`, "", `Servicio: **${repositoryId}**  `, `Dirección: **${endpoint.direction}**  `, `${endpoint.direction === "entrada" ? "Handler" : "Cliente"} observado: \`${endpoint.handler}\`  `, `Destino correlacionado: **${endpoint.target}**  `, `Estado: **${endpoint.status}**  `, `Archivo de origen: \`${endpoint.source_path}\``, "", "> El diagrama representa dependencias/imports estáticos alcanzables desde el punto observado. No es telemetría ni garantiza el orden de ejecución.", "", "## Diagrama del flujo", "", "```mermaid", renderEndpointMermaid(flow), "```", "", "## Módulos alcanzables", "", "| Origen | Destino | Símbolos importados |", "|---|---|---|", ...(flow.module_edges.length > 0 ? flow.module_edges.map((edge) => `| ${cell(edge.from)} | ${cell(edge.to)} | ${cell(edge.imports.join(", ") || "import lateral")} |`) : [`| ${cell(endpoint.source_path)} | No detectado | No detectado |`]), "", "## Evidencia", "", endpoint.evidence, "", "[[../servicio|Volver al servicio]]", ""].join("\n");
}
function renderSemanticFlowDocument(flow, repositoryId) {
    const endpoint = flow.endpoint, semantic = flow.semantic;
    const methodRows = semantic.symbols.length > 0 ? semantic.symbols.map((symbol, index) => `| ${index + 1} | ${cell(symbol.class_name ?? "Función independiente")} | ${cell(symbol.name)} | ${cell(symbol.description)} | ${cell(symbol.source_path)}:${symbol.start_line ?? "?"} |`) : [`| 1 | No resuelto | ${cell(endpoint.handler)} | No se pudo enlazar con un símbolo AST. | ${cell(endpoint.source_path)} |`];
    const dataRows = semantic.data.length > 0 ? semantic.data.map((item) => `| ${cell(item.operation)} | ${cell(item.entity)} | ${cell(item.source_path)} | ${cell(item.evidence_ids.join(", "))} |`) : ["| No detectado | No detectado | No detectado | No disponible |"];
    const integrationRows = semantic.integrations.length > 0 ? semantic.integrations.map((item) => `| ${cell(item.method)} | ${cell(item.target)} | ${cell(item.source_path)} |`) : ["| No detectada | No detectada | No detectada |"];
    const limitations = semantic.limitations.length > 0 ? semantic.limitations.map((value) => `- ${value}`) : ["- Sin limitaciones semánticas adicionales detectadas."];
    const snippets = semantic.symbols.filter((symbol) => symbol.snippet !== "").slice(0, 8).flatMap((symbol) => [`### ${symbol.class_name === null ? symbol.name : `${symbol.class_name}.${symbol.name}`}`, "", `\`${symbol.source_path}:${symbol.start_line ?? "?"}\``, "", `\`\`\`${languageForSnippet(symbol.source_path)}\n${symbol.snippet}\n\`\`\``, ""]);
    return [`# Entrada ${endpoint.method} ${endpoint.path}`, "", `Servicio: **${repositoryId}**  `, `Handler observado: \`${endpoint.handler}\`  `, `Estado: **${endpoint.status}**  `, `Archivo de origen: \`${endpoint.source_path}\``, "", "> El flujo usa llamadas entre símbolos extraídas del AST. No representa telemetría; una llamada candidata o no resuelta se conserva como limitación explícita.", "", "## Diagrama del flujo", "", "```mermaid", renderEndpointMermaid(flow), "```", "", "## Clases y métodos del flujo", "", "| Paso | Clase | Método o función | Responsabilidad derivada | Evidencia de origen |", "|---:|---|---|---|---|", ...methodRows, "", "## Datos utilizados", "", "| Operación | Entidad o recurso | Archivo | Evidencia |", "|---|---|---|---|", ...dataRows, "", "## Integraciones salientes", "", "| Método | Destino | Archivo |", "|---|---|---|", ...integrationRows, "", "## Fragmentos observados", "", ...(snippets.length > 0 ? snippets : ["No hay fragmentos disponibles para este flujo.", ""]), "## Limitaciones", "", ...limitations, "", "## Evidencia del endpoint", "", endpoint.evidence, "", "[[../servicio|Volver al servicio]]", ""].join("\n");
}
function renderEndpointMermaid(flow) {
    const ids = new Map(), lines = ["flowchart TB"], id = (path) => { let value = ids.get(path); if (!value) {
        value = `m${ids.size}`;
        ids.set(path, value);
    } return value; };
    if (flow.semantic !== null && flow.semantic.symbols.length > 0) {
        lines.push(`  endpoint["${escapeMermaid(`${flow.endpoint.method} ${flow.endpoint.path}`)}"] --> ${id(flow.semantic.symbols[0].id)}["${escapeMermaid(symbolLabel(flow.semantic.symbols[0]))}"]`);
        const symbolById = new Map(flow.semantic.symbols.map((symbol) => [symbol.id, symbol]));
        for (const call of flow.semantic.calls) {
            const from = symbolById.get(call.caller_symbol_id), to = call.target_symbol_id === null ? undefined : symbolById.get(call.target_symbol_id);
            if (from === undefined)
                continue;
            if (to !== undefined)
                lines.push(`  ${id(from.id)}["${escapeMermaid(symbolLabel(from))}"] -->|"${escapeMermaid(call.expression)}"| ${id(to.id)}["${escapeMermaid(symbolLabel(to))}"]`);
            else {
                const unresolved = id(`unresolved:${call.caller_symbol_id}:${call.expression}`);
                lines.push(`  ${id(from.id)} -.->|"${escapeMermaid(`${call.expression} · ${call.resolution}`)}"| ${unresolved}["${escapeMermaid(call.callee_name)}"]`);
            }
        }
        for (const item of flow.semantic.data) {
            const dataId = id(`data:${item.entity}:${item.operation}`), last = [...flow.semantic.symbols].reverse().find((symbol) => symbol.source_path === item.source_path) ?? flow.semantic.symbols.at(-1);
            lines.push(`  ${id(last.id)} -->|"${escapeMermaid(item.operation)}"| ${dataId}[("${escapeMermaid(item.entity)}")]`);
        }
        return lines.join("\n");
    }
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
        return "flowchart TB\n  empty[\"Sin sistemas ni llamadas HTTP detectadas\"]";
    const ids = new Map(), id = (nodeId) => { let value = ids.get(nodeId); if (!value) {
        value = `s${ids.size}`;
        ids.set(nodeId, value);
    } return value; };
    const lines = ["flowchart TB"];
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
function normalizeRoute(value) { const normalized = value.trim().replace(/\/{2,}/gu, "/").replace(/\/$/u, ""); return normalized || "/"; }
function semanticSymbol(fact) { const value = asRecord(fact.value), id = String(value.symbol_id ?? ""), name = String(value.name ?? ""); if (id === "" || name === "")
    return null; return { id, name, class_name: typeof value.class_name === "string" ? value.class_name : null, symbol_type: String(value.symbol_type ?? "symbol"), signature: String(value.signature ?? name), description: String(value.description ?? "Descripción no disponible."), source_path: String(value.source_path ?? ""), start_line: typeof value.start_line === "number" ? value.start_line : null, end_line: typeof value.end_line === "number" ? value.end_line : null, snippet: String(value.snippet ?? "") }; }
function symbolLabel(symbol) { return symbol.class_name === null ? symbol.name : `${symbol.class_name}.${symbol.name}`; }
function portableSlug(value) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "simbolo"; }
function languageForSnippet(path) { if (/\.java$/iu.test(path))
    return "java"; if (/\.tsx$/iu.test(path))
    return "tsx"; if (/\.[cm]?ts$/iu.test(path))
    return "typescript"; return "javascript"; }
function layerOrder(value) { const order = ["root", "api", "application", "domain", "infrastructure", "components", "services", "config", "types"]; const index = order.indexOf(value); return index < 0 ? order.length : index; }
function simpleTypeName(value) { return value.replace(/<.*>/gu, "").replace(/\[\]$/u, "").split(/[.$]/u).at(-1)?.trim() ?? value; }
function countValues(values) { const result = new Map(); for (const value of values)
    result.set(value, (result.get(value) ?? 0) + 1); return new Map([...result.entries()].sort(([a], [b]) => a.localeCompare(b))); }
function treeLines(paths) {
    const root = { children: new Map(), file: false };
    for (const path of paths) {
        let current = root;
        const parts = path.split("/").filter(Boolean);
        for (let index = 0; index < parts.length; index += 1) {
            const part = parts[index];
            let child = current.children.get(part);
            if (child === undefined) {
                child = { children: new Map(), file: false };
                current.children.set(part, child);
            }
            if (index === parts.length - 1)
                child.file = true;
            current = child;
        }
    }
    const result = [];
    const visit = (node, prefix) => { const entries = [...node.children.entries()].sort(([nameA, a], [nameB, b]) => Number(a.children.size === 0) - Number(b.children.size === 0) || nameA.localeCompare(nameB)); entries.forEach(([name, child], index) => { const last = index === entries.length - 1; result.push(`${prefix}${last ? "└── " : "├── "}${name}${child.children.size > 0 && !child.file ? "/" : ""}`); visit(child, `${prefix}${last ? "    " : "│   "}`); }); };
    visit(root, "");
    return result;
}
function asRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function escapeMermaid(value) { return value.replace(/["\r\n<>]/gu, " ").replace(/\|/gu, "/").trim(); }
function cell(value) { return value.replaceAll("|", "\\|").replace(/[\r\n]/gu, " "); }
//# sourceMappingURL=vault.js.map