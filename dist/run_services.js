import { mkdir, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { compareFacts } from "./compare.js";
import { createProposal } from "./proposal/model.js";
import { atomicWrite } from "./platform/fs.js";
import { stableId } from "./platform/hash.js";
import { queryFacts, renderFactTable } from "./query.js";
import { createDocumentModel } from "./documentation/model.js";
import { renderDocument } from "./documentation/render.js";
import { buildCandidateVault } from "./obsidian/vault.js";
import { validateDocument } from "./review/validators.js";
import { loadArchifySkill } from "./documentation/skill.js";
import { createAutomaticPublicationReceipt } from "./review/approval.js";
import { LocalPublicationTarget } from "./publication/local.js";
import { createPublicationManifest } from "./publication/manifest.js";
import { buildGraph } from "./correlation/graph.js";
import { redactValue } from "./security/redaction.js";
export async function prepareRunDocumentation(packageRoot, config, runId) {
    const requestedArtifacts = await loadRunArtifacts(config, runId);
    const { artifacts, catalog } = await composeWorkspaceArtifacts(config, requestedArtifacts);
    const skill = await loadArchifySkill(packageRoot);
    const model = createDocumentModel({ runId, title: `Arquitectura y documentación ${runId}`, snapshots: artifacts.snapshots, facts: artifacts.facts, graph: artifacts.graph, archifyAvailable: skill.mode === "archify", archifyVersion: skill.version });
    const serviceModels = new Map(artifacts.snapshots.map((snapshot) => {
        const repositoryId = snapshot.repository_id;
        const facts = artifacts.facts.filter((fact) => fact.component_id === repositoryId || fact.component_id.startsWith(`${repositoryId}:`));
        const componentId = `component:${repositoryId}`;
        const edges = artifacts.graph.edges.filter((edge) => edge.from === componentId || edge.to === componentId);
        const nodeIds = new Set([componentId, ...edges.flatMap((edge) => [edge.from, edge.to])]);
        const graph = { ...artifacts.graph, snapshot_ids: [snapshot.id], nodes: artifacts.graph.nodes.filter((node) => nodeIds.has(node.id)), edges };
        return [repositoryId, createDocumentModel({ runId, title: `Servicio ${repositoryId}`, snapshots: [snapshot], facts, graph, archifyAvailable: skill.mode === "archify", archifyVersion: skill.version })];
    }));
    const candidate = join(artifacts.root, "candidate-vault");
    await rm(candidate, { recursive: true, force: true });
    await buildCandidateVault(candidate, model, artifacts.graph, serviceModels, artifacts.facts, repositoryProfileOverrides(config.overrides));
    await atomicWrite(join(candidate, "fuentes-conocimiento.json"), `${JSON.stringify(catalog, null, 2)}\n`);
    const rendered = renderDocument(model);
    const issues = validateDocument(model, { facts: artifacts.facts, evidence: artifacts.evidence, graph: artifacts.graph, rendered });
    await atomicWrite(join(artifacts.root, "document-model.json"), `${JSON.stringify(model, null, 2)}\n`);
    await atomicWrite(join(artifacts.root, "review.json"), `${JSON.stringify({ schema_version: 3, run_id: runId, issues, unresolved_questions: [], status: issues.some((item) => item.severity === "error" || item.severity === "security") ? "review_required" : "review", archify: { skill_status: skill.status, mode: skill.mode, sha256: skill.sha256, implementation: skill.implementation } }, null, 2)}\n`);
    return { status: "review", run_id: runId, candidate_vault: candidate, issues: issues.length, blocking_issues: issues.filter((item) => item.severity === "error" || item.severity === "security").length, model_status: model.status, repository_count: artifacts.snapshots.length, repository_sources: catalog.repositories, knowledge_catalog: catalog, archify: { skill_status: skill.status, mode: skill.mode, external_implementation: skill.implementation } };
}
/** Loads the requested run together with the latest published knowledge for repositories not present in it. */
export async function loadWorkspaceArtifacts(config, runId) {
    const requested = await loadRunArtifacts(config, runId);
    return (await composeWorkspaceArtifacts(config, requested)).artifacts;
}
async function composeWorkspaceArtifacts(config, requested) {
    const configured = new Set(config.repositories.map((repository) => repository.id));
    const sources = await discoverPublishedRepositorySources(config, configured);
    for (const snapshot of requested.snapshots)
        sources.set(snapshot.repository_id, requested.run_id);
    const cache = new Map([[requested.run_id, requested]]);
    const snapshots = [], facts = [], evidence = [], inventories = [];
    const repositorySources = {};
    for (const [repositoryId, sourceRunId] of [...sources.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        if (!configured.has(repositoryId))
            continue;
        let source = cache.get(sourceRunId);
        if (source === undefined) {
            try {
                source = await loadRunArtifacts(config, sourceRunId);
            }
            catch {
                continue;
            }
            cache.set(sourceRunId, source);
        }
        const snapshot = source.snapshots.find((item) => item.repository_id === repositoryId);
        const inventory = source.inventories.find((item) => item.repository_id === repositoryId);
        if (snapshot === undefined || inventory === undefined)
            continue;
        snapshots.push(snapshot);
        inventories.push(inventory);
        for (const fact of source.facts)
            if (fact.component_id === repositoryId || fact.component_id.startsWith(`${repositoryId}:`))
                facts.push(fact);
        for (const item of source.evidence)
            if (item.repository_id === repositoryId)
                evidence.push(item);
        repositorySources[repositoryId] = { run_id: sourceRunId, snapshot_id: snapshot.id, commit_oid: snapshot.commit_oid, requested_ref: snapshot.requested_ref };
    }
    const aliases = Object.fromEntries(Object.entries(asObject(config.overrides?.aliases)).filter((entry) => typeof entry[1] === "string"));
    const scenario = {
        schema_version: 3,
        id: stableId("scenario", snapshots.map((snapshot) => snapshot.id), aliases),
        snapshots: snapshots.map((snapshot) => ({ repository_id: snapshot.repository_id, snapshot_id: snapshot.id })),
        environment: null,
        aliases,
    };
    const graph = buildGraph(facts, scenario);
    const catalog = { schema_version: 3, repositories: repositorySources, updated_at: new Date().toISOString() };
    return { artifacts: { run_id: requested.run_id, root: requested.root, snapshots, facts, evidence, inventories, graph }, catalog };
}
async function discoverPublishedRepositorySources(config, configured) {
    const result = new Map();
    const stored = await readJson(join(config.state_root, "knowledge-catalog.json")).catch(() => null);
    if (stored?.schema_version === 3)
        for (const [repositoryId, entry] of Object.entries(stored.repositories)) {
            if (configured.has(repositoryId) && /^run-[A-Za-z0-9._-]+$/u.test(entry.run_id))
                result.set(repositoryId, entry.run_id);
        }
    const entries = await readdir(join(config.state_root, "runs"), { withFileTypes: true }).catch(() => []);
    for (const entry of entries.filter((item) => item.isDirectory() && /^run-[A-Za-z0-9._-]+$/u.test(item.name)).sort((a, b) => a.name.localeCompare(b.name))) {
        const root = validatedRunRoot(config.state_root, entry.name);
        const published = await readFile(join(root, "publication-authorization.json"), "utf8").then(() => true).catch(() => false);
        if (!published)
            continue;
        const run = await readJson(join(root, "run.json")).catch(() => null);
        for (const snapshot of run?.snapshots ?? [])
            if (configured.has(snapshot.repository_id))
                result.set(snapshot.repository_id, entry.name);
    }
    return result;
}
function repositoryProfileOverrides(overrides) {
    const metadata = asObject(overrides?.repository_metadata);
    const result = {};
    for (const [repositoryId, rawProfile] of Object.entries(metadata)) {
        const profile = asObject(rawProfile);
        const normalized = {};
        if (typeof profile.type === "string")
            normalized.type = profile.type;
        if (typeof profile.label === "string")
            normalized.label = profile.label;
        if (typeof profile.domain === "string")
            normalized.domain = profile.domain;
        result[repositoryId] = normalized;
    }
    return result;
}
function asObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
export async function prepareAndPublishDocumentation(packageRoot, config, runId) {
    const prepared = await prepareRunDocumentation(packageRoot, config, runId);
    if (prepared.blocking_issues > 0)
        throw new Error(`La validación mecánica bloqueó la publicación: ${prepared.blocking_issues} incidencia(s) de error o seguridad.`);
    const current = await equivalentCurrentEdition(config.vault_root, runId, prepared.candidate_vault);
    if (current !== null) {
        await persistKnowledgeCatalog(config, prepared.knowledge_catalog, runId);
        return { ...prepared, status: "published", published: true, reused_edition: true, edition: current, obsidian_path: join(config.vault_root, "Actual", "Inicio.md") };
    }
    const authorization = await createAutomaticPublicationReceipt({ runId, candidateRoot: prepared.candidate_vault, scope: [runId] });
    await atomicWrite(join(validatedRunRoot(config.state_root, runId), "publication-authorization.json"), `${JSON.stringify(authorization, null, 2)}\n`);
    const edition = await new LocalPublicationTarget(config.vault_root, "automatic-primary").publish(prepared.candidate_vault, authorization, {});
    await persistKnowledgeCatalog(config, prepared.knowledge_catalog, runId);
    return { ...prepared, status: "published", published: true, reused_edition: false, edition, obsidian_path: join(config.vault_root, "Actual", "Inicio.md") };
}
async function persistKnowledgeCatalog(config, catalog, publicationRunId) {
    await atomicWrite(join(config.state_root, "knowledge-catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);
    const repositories = Object.keys(catalog.repositories).sort();
    const refs = Object.fromEntries(Object.entries(catalog.repositories).map(([id, entry]) => [id, entry.requested_ref]));
    await atomicWrite(join(config.state_root, "current-run.json"), `${JSON.stringify({ schema_version: 3, run_id: publicationRunId, repositories, refs, repository_sources: catalog.repositories, published: true, updated_at: new Date().toISOString() }, null, 2)}\n`);
}
async function equivalentCurrentEdition(vaultRoot, runId, candidateRoot) {
    let current;
    try {
        current = await readJson(join(vaultRoot, "Actual", "edicion.json"));
    }
    catch {
        return null;
    }
    if (current.run_id !== runId)
        return null;
    const candidate = await createPublicationManifest({ editionId: current.edition_id, runId, root: candidateRoot, previousEditionId: current.previous_edition_id });
    const comparable = (manifest) => manifest.files.map((file) => ({ path: file.path, sha256: file.sha256, size: file.size }));
    return JSON.stringify(comparable(current)) === JSON.stringify(comparable(candidate)) ? current : null;
}
export async function loadRunArtifacts(config, runId) {
    const root = validatedRunRoot(config.state_root, runId);
    const run = await readJson(join(root, "run.json"));
    const graph = redactValue(await readJson(join(root, "graph.json")));
    const facts = [];
    const evidence = [];
    const inventories = [];
    for (const repositoryId of [...new Set(run.snapshots.map((snapshot) => snapshot.repository_id))]) {
        for (const fact of await readJson(join(root, repositoryId, "facts", "all.json")))
            facts.push({ ...fact, value: redactValue(fact.value) });
        for (const item of await readJson(join(root, repositoryId, "evidence.json")))
            evidence.push(item);
        inventories.push(await readJson(join(root, repositoryId, "inventory.json")));
    }
    return { run_id: runId, root, snapshots: run.snapshots, facts, evidence, inventories, graph };
}
export function queryRunArtifacts(artifacts, category, options = {}) {
    if (category !== "coverage" && category !== "evidence")
        return queryFacts(artifacts.facts, category, { ...(options.componentId === undefined ? {} : { componentId: options.componentId }), ...(options.offset === undefined ? {} : { offset: options.offset }), ...(options.limit === undefined ? {} : { limit: options.limit }) });
    const source = category === "coverage"
        ? artifacts.inventories.filter((item) => options.repositoryId === undefined || item.repository_id === options.repositoryId).map((item) => ({ repository_id: item.repository_id, snapshot_id: item.snapshot_id, coverage: item.coverage }))
        : artifacts.evidence.filter((item) => options.repositoryId === undefined || item.repository_id === options.repositoryId);
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 100;
    const items = source.slice(offset, offset + limit);
    return { total: source.length, offset, limit, items, complete: offset + items.length >= source.length };
}
export function renderRunQueryTable(category, result) {
    if (category !== "coverage" && category !== "evidence") {
        return renderFactTable(result);
    }
    if (category === "coverage") {
        const rows = result.items;
        return ["repository | processed | failed | unsupported | not_scanned", "--- | ---: | ---: | ---: | ---:", ...rows.map((item) => `${item.repository_id} | ${item.coverage.processed} | ${item.coverage.failed} | ${item.coverage.unsupported} | ${item.coverage.not_scanned}`)].join("\n");
    }
    const rows = result.items;
    return ["repository | path | rule | locator", "--- | --- | --- | ---", ...rows.map((item) => `${item.repository_id} | ${item.relative_path} | ${item.rule_id} | ${JSON.stringify(item.locator)}`)].join("\n");
}
export function traceFlow(graph, runId, fromInput, toInput, maxDepth = 12) {
    const from = resolveNode(graph, fromInput);
    const to = resolveNode(graph, toInput);
    if (!from || !to) {
        return { schema_version: 3, run_id: runId, from: fromInput, to: toInput, status: "unresolved", paths: [], limitations: [!from ? `Origen no resuelto: ${fromInput}` : `Destino no resuelto: ${toInput}`] };
    }
    const paths = [];
    const queue = [{ node: from.id, edges: [], visited: new Set([from.id]) }];
    while (queue.length > 0 && paths.length < 20) {
        const current = queue.shift();
        if (current.node === to.id && current.edges.length > 0) {
            paths.push({ nodes: nodesForPath(graph, from.id, current.edges), edges: current.edges });
            continue;
        }
        if (current.edges.length >= maxDepth)
            continue;
        for (const edge of graph.edges.filter((candidate) => candidate.from === current.node)) {
            if (current.visited.has(edge.to))
                continue;
            queue.push({ node: edge.to, edges: [...current.edges, edge], visited: new Set([...current.visited, edge.to]) });
        }
    }
    const statuses = paths.flatMap((path) => path.edges.map((edge) => edge.status));
    const status = paths.length === 0 || statuses.includes("unresolved") ? "unresolved" : statuses.includes("candidate") ? "candidate" : "supported";
    return { schema_version: 3, run_id: runId, from: from.id, to: to.id, status, paths, limitations: paths.length === 0 ? ["No se encontró un camino dirigido respaldado por los hechos extraídos."] : [...new Set(paths.flatMap((path) => path.edges.flatMap((edge) => edge.limitations)))] };
}
export function explainRelations(graph, runId, fromInput, toInput) {
    if (fromInput && toInput)
        return traceFlow(graph, runId, fromInput, toInput);
    const from = fromInput ? resolveNode(graph, fromInput) : undefined;
    const to = toInput ? resolveNode(graph, toInput) : undefined;
    if ((fromInput && !from) || (toInput && !to))
        return { schema_version: 3, run_id: runId, status: "unresolved", nodes: [], edges: [], limitations: ["No se pudo resolver uno de los componentes solicitados."] };
    const edges = graph.edges.filter((edge) => (!from || edge.from === from.id || edge.to === from.id) && (!to || edge.from === to.id || edge.to === to.id));
    const nodeIds = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
    return { schema_version: 3, run_id: runId, status: edges.some((edge) => edge.status === "unresolved") ? "unresolved" : edges.some((edge) => edge.status === "candidate") ? "candidate" : "supported", nodes: graph.nodes.filter((node) => nodeIds.has(node.id)), edges, limitations: edges.length === 0 ? ["No hay relaciones respaldadas por evidencia para el filtro solicitado."] : [...new Set(edges.flatMap((edge) => edge.limitations))] };
}
export async function compareRuns(config, baseRunId, targetRunId, repositoryId) {
    const base = await loadRunArtifacts(config, baseRunId);
    const target = await loadRunArtifacts(config, targetRunId);
    const filter = (facts) => repositoryId ? facts.filter((fact) => fact.component_id === repositoryId || fact.component_id.startsWith(`${repositoryId}:`)) : facts;
    const selectedBase = filter(base.facts);
    const selectedTarget = filter(target.facts);
    const complete = selectedBase.length > 0 && selectedTarget.length > 0;
    return { schema_version: 3, base_run_id: baseRunId, target_run_id: targetRunId, repository_id: repositoryId ?? null, complete, diff: compareFacts(selectedBase, selectedTarget, complete) };
}
export async function prepareProposal(config, runId, type, request, humanRequirements = []) {
    if (!["specification", "migration", "adr"].includes(type))
        throw new Error(`Tipo de propuesta no soportado: ${type}`);
    if (request.trim() === "")
        throw new Error("La solicitud de propuesta está vacía.");
    const artifacts = await loadRunArtifacts(config, runId);
    const findings = findingsFromGraph(artifacts.graph);
    const proposal = createProposal({ type, findings, graph: artifacts.graph, evidence: artifacts.evidence, requestedChanges: [request.trim()], humanRequirements });
    const proposalId = proposalIdentifier(runId, type, request, humanRequirements);
    const root = join(artifacts.root, "proposals", proposalId);
    await mkdir(root, { recursive: true });
    const jsonPath = join(root, "proposal.json");
    const markdownPath = join(root, "proposal.md");
    await atomicWrite(jsonPath, `${JSON.stringify({ proposal_id: proposalId, run_id: runId, ...proposal }, null, 2)}\n`);
    await atomicWrite(markdownPath, renderProposal(proposalId, runId, proposal));
    return { proposal_id: proposalId, status: "review_required", json_path: jsonPath, markdown_path: markdownPath, proposal };
}
export function proposalIdentifier(runId, type, request, humanRequirements) {
    return stableId("proposal", runId, type, request, humanRequirements);
}
export function validatedRunRoot(stateRoot, runId) {
    if (!/^run-[A-Za-z0-9._-]+$/u.test(runId))
        throw new Error("run_id inválido.");
    return join(stateRoot, "runs", runId);
}
function resolveNode(graph, input) {
    const normalized = input.trim().toLocaleLowerCase("en-US");
    return graph.nodes.find((node) => node.id.toLocaleLowerCase("en-US") === normalized)
        ?? graph.nodes.find((node) => node.id.toLocaleLowerCase("en-US") === `component:${normalized}`)
        ?? graph.nodes.find((node) => node.label.toLocaleLowerCase("en-US") === normalized);
}
function nodesForPath(graph, start, edges) {
    const ids = [start, ...edges.map((edge) => edge.to)];
    return ids.map((id) => graph.nodes.find((node) => node.id === id)).filter((node) => node !== undefined);
}
function findingsFromGraph(graph) {
    return graph.edges.map((edge) => ({ schema_version: 3, id: stableId("finding", edge.id), classification: edge.status === "supported" ? "fact" : edge.status === "candidate" ? "inference" : "unknown", statement: `${edge.from} ${edge.type} ${edge.to}`, fact_ids: edge.fact_ids, evidence_ids: edge.evidence_ids, limitations: edge.limitations }));
}
function renderProposal(proposalId, runId, proposal) {
    const section = (title, values) => `## ${title}\n\n${values.length > 0 ? values.map((value) => `- ${value}`).join("\n") : "- Pendiente de decisión humana."}\n\n`;
    return `# Propuesta ${proposalId}\n\nEstado: **requiere revisión**  \nRun de evidencia: \`${runId}\`  \nTipo: \`${proposal.proposal_type}\`\n\n${section("Estado actual", proposal.current_state)}${section("Cambios propuestos", proposal.proposed_changes)}${section("Componentes afectados", proposal.affected_components)}${section("Requisitos", proposal.requirements)}${section("Contratos", proposal.contracts)}${section("Fases", proposal.phases)}${section("Criterios de aceptación", proposal.acceptance_criteria)}${section("Pruebas previstas", proposal.tests)}${section("Riesgos", proposal.risks)}${section("Rollback", proposal.rollback)}${section("Alternativas", proposal.alternatives)}${section("Decisiones pendientes", proposal.pending_decisions)}`;
}
async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }
//# sourceMappingURL=run_services.js.map