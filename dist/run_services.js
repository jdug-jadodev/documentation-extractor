import { access, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { compareFacts } from "./compare.js";
import { createProposal } from "./proposal/model.js";
import { atomicWrite } from "./platform/fs.js";
import { sha256, stableId } from "./platform/hash.js";
import { queryFacts, renderFactTable } from "./query.js";
import { createDocumentModel, resolveEndpointFacts } from "./documentation/model.js";
import { graphForFacts, isTestSourcePath, productionFacts } from "./documentation/source_scope.js";
import { renderDocument } from "./documentation/render.js";
import { buildCandidateVault, renderScopedFlowDocumentation } from "./obsidian/vault.js";
import { validateDocument } from "./review/validators.js";
import { loadArchifySkill } from "./documentation/skill.js";
import { createAutomaticPublicationReceipt } from "./review/approval.js";
import { LocalPublicationTarget } from "./publication/local.js";
import { createPublicationManifest } from "./publication/manifest.js";
import { buildGraph } from "./correlation/graph.js";
import { assertNoKnownSecret, redactValue } from "./security/redaction.js";
import { buildDocumentationIntelligence } from "./intelligence/index.js";
import { expandDocumentContext, loadContext, prepareAnalysisContext, searchDocumentation } from "./intelligence/retrieval.js";
import { analyzeChange, assessMigration, explainResponsibilities, investigationDecision, locateCapability, traceBusinessFlow } from "./intelligence/analysis.js";
import { isContainedPath } from "./platform/paths.js";
export function findDocumentableFlows(component, query, facts, limit = 20) {
    const tokens = searchTokens(query);
    if (tokens.length === 0)
        return [];
    return resolveEndpointFacts(productionFacts(facts))
        .filter((endpoint) => endpoint.component === component)
        .map((endpoint) => {
        const pathWords = searchTokens(`${endpoint.method} ${endpoint.path}`);
        const contextWords = searchTokens(`${endpoint.handler} ${endpoint.source_path}`);
        const score = tokens.reduce((total, token) => {
            if (pathWords.some((word) => word === token))
                return total + 8;
            if (pathWords.some((word) => prefixMatch(word, token)))
                return total + 5;
            if (contextWords.some((word) => word === token))
                return total + 3;
            return total + (contextWords.some((word) => prefixMatch(word, token)) ? 1 : 0);
        }, 0);
        return { component, method: endpoint.method, path: endpoint.path, handler: endpoint.handler, source_path: endpoint.source_path, score };
    })
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
        .slice(0, Math.max(1, Math.min(limit, 100)));
}
export async function prepareFlowDocumentation(config, runId, component, method, path) {
    const artifacts = await loadWorkspaceArtifacts(config, runId);
    const document = renderScopedFlowDocumentation(component, method, path, artifacts.facts);
    assertNoKnownSecret(document.markdown);
    const output = join(config.vault_root, "Consultas", safeSegment(runId), safeSegment(component), `${document.slug}.md`);
    await atomicWrite(output, document.markdown);
    return { schema_version: 3, status: "generated", scope: "single_flow", run_id: runId, component, method: document.method, path: document.path, handler: document.handler, source_path: document.source_path, markdown_path: output, repository_reads: 0, ai_invocations: 0 };
}
export async function searchRunDocumentation(packageRoot, config, runId, query, repository, limit) {
    const artifacts = await ensureDocumentationIntelligence(packageRoot, config, runId);
    return await searchDocumentation(artifacts.root, query, { ...(repository === undefined ? {} : { repository }), ...(limit === undefined ? {} : { limit }) });
}
export async function expandRunDocumentContext(packageRoot, config, runId, chunkIds, depth, limit) {
    const artifacts = await ensureDocumentationIntelligence(packageRoot, config, runId);
    return await expandDocumentContext(artifacts.root, chunkIds, depth, limit);
}
export async function prepareRunAnalysisContext(packageRoot, config, runId, query, intent, repository) {
    const artifacts = await ensureDocumentationIntelligence(packageRoot, config, runId);
    const configured = config.documentation_intelligence;
    const budget = configured === undefined ? undefined : { max_context_tokens: configured.max_context_tokens, max_documents: configured.max_documents, max_flows: configured.max_flows, max_symbols: configured.max_symbols, max_documents_per_repository: configured.max_documents_per_repository };
    return await prepareAnalysisContext({ runId, runRoot: artifacts.root, query, intent, ...(repository === undefined ? {} : { repository }), ...(budget === undefined ? {} : { budget }) });
}
export async function locateRunCapability(packageRoot, config, runId, query) {
    const artifacts = await ensureDocumentationIntelligence(packageRoot, config, runId);
    return await locateCapability(artifacts.root, query);
}
export async function traceRunBusinessFlow(packageRoot, config, runId, query) {
    const artifacts = await ensureDocumentationIntelligence(packageRoot, config, runId);
    return await traceBusinessFlow(artifacts.root, query);
}
export async function explainRunResponsibilities(packageRoot, config, runId, query) {
    const artifacts = await ensureDocumentationIntelligence(packageRoot, config, runId);
    return await explainResponsibilities(artifacts.root, query);
}
export async function analyzeRunChange(packageRoot, config, runId, request, contextId) {
    const run = await ensureDocumentationIntelligence(packageRoot, config, runId), artifacts = await loadWorkspaceArtifacts(config, runId);
    const result = await analyzeChange({ runId, runRoot: run.root, request, facts: productionFacts(artifacts.facts), graph: graphForFacts(artifacts.graph, productionFacts(artifacts.facts)), ...(contextId === undefined ? {} : { contextId }) });
    await atomicWrite(join(run.root, "documentation-intelligence", "analyses", `${result.analysis_id}.json`), `${JSON.stringify(result, null, 2)}\n`);
    return result;
}
export async function assessRunMigration(packageRoot, config, runId, request, options = {}) {
    const run = await ensureDocumentationIntelligence(packageRoot, config, runId), artifacts = await loadWorkspaceArtifacts(config, runId);
    const result = await assessMigration({ runId, runRoot: run.root, request, facts: productionFacts(artifacts.facts), graph: graphForFacts(artifacts.graph, productionFacts(artifacts.facts)), ...(options.contextId === undefined ? {} : { contextId: options.contextId }), ...(options.from === undefined ? {} : { from: options.from }), ...(options.to === undefined ? {} : { to: options.to }) });
    await atomicWrite(join(run.root, "documentation-intelligence", "migrations", `${result.migration_id}.json`), `${JSON.stringify(result, null, 2)}\n`);
    return result;
}
export async function investigateRunFlow(packageRoot, config, runId, query, level = 1) {
    const context = await prepareRunAnalysisContext(packageRoot, config, runId, query, "development"), artifacts = await loadWorkspaceArtifacts(config, runId);
    const escalation = investigationDecision(context, level), limits = config.investigation ?? { max_dependency_depth: 3, default_max_files: 8, hard_max_files: 20, default_max_bytes: 262_144, hard_max_bytes: 1_048_576, allow_repository_wide_scan: false };
    const selectedPaths = [...new Set(context.chunks.flatMap((chunk) => chunk.source_paths).filter((path) => !isTestSourcePath(path)))].slice(0, limits.default_max_files);
    const selectedPathSet = new Set(selectedPaths), contextEvidence = new Set(context.chunks.flatMap((chunk) => chunk.evidence_ids));
    const directedFacts = productionFacts(artifacts.facts).filter((fact) => {
        const value = asObject(fact.value), source = typeof value.source_path === "string" ? value.source_path : null, target = typeof value.target_path === "string" ? value.target_path : null;
        return (source !== null && selectedPathSet.has(source)) || (target !== null && selectedPathSet.has(target)) || fact.evidence_ids.some((id) => contextEvidence.has(id));
    });
    const authorizedEvidence = artifacts.evidence.filter((item) => !isTestSourcePath(item.relative_path) && (selectedPathSet.has(item.relative_path) || contextEvidence.has(item.id))).slice(0, limits.hard_max_files).map((item) => ({ evidence_id: item.id, repository_id: item.repository_id, source_path: item.relative_path, locator: item.locator }));
    const restrictedAgentHandoff = level >= 5 ? { question: query, context_id: context.context_id, missing_information: context.missing_information, authorized_evidence: authorizedEvidence, budget: { max_dependency_depth: limits.max_dependency_depth, max_files: limits.default_max_files, max_bytes: limits.default_max_bytes }, tools: [], repository_wide_scan: false } : null;
    return { schema_version: 3, run_id: runId, query, context, escalation, directed_analysis: { mode: "indexed_facts", source_paths: selectedPaths, fact_ids: directedFacts.map((fact) => fact.id), evidence_ids: [...new Set(directedFacts.flatMap((fact) => fact.evidence_ids))], max_dependency_depth: limits.max_dependency_depth }, authorized_evidence: authorizedEvidence, restricted_agent_handoff: restrictedAgentHandoff, repository_wide_scan: false, repository_reads: 0, bytes_read: 0 };
}
export async function readRunSourceEvidence(config, runId, evidenceId, maxBytes = 65_536) {
    const artifacts = await loadWorkspaceArtifacts(config, runId), evidence = artifacts.evidence.find((item) => item.id === evidenceId);
    if (evidence === undefined)
        throw new Error(`Evidencia no encontrada: ${evidenceId}.`);
    if (isTestSourcePath(evidence.relative_path))
        throw new Error("La evidencia pertenece a pruebas y no está autorizada por defecto.");
    const repository = config.repositories.find((item) => item.id === evidence.repository_id);
    if (repository === undefined)
        throw new Error(`Repositorio no configurado para la evidencia: ${evidence.repository_id}.`);
    const path = resolve(repository.root, evidence.relative_path);
    if (!isContainedPath(repository.root, path))
        throw new Error("La evidencia intenta salir del repositorio autorizado.");
    const auditPath = join(validatedRunRoot(config.state_root, runId), "documentation-intelligence", "source-read-audit.jsonl"), previous = await readFile(auditPath, "utf8").catch(() => "");
    const previousReads = previous.split(/\r?\n/u).filter(Boolean).flatMap((line) => { try {
        return [JSON.parse(line)];
    }
    catch {
        return [];
    } });
    const configuredHardFiles = config.investigation?.hard_max_files ?? 20, configuredHardBytes = config.investigation?.hard_max_bytes ?? 1_048_576;
    if (!previousReads.some((item) => item.evidence_id === evidenceId) && new Set(previousReads.map((item) => item.evidence_id).filter(Boolean)).size >= configuredHardFiles)
        throw new Error(`El run alcanzó el límite de ${configuredHardFiles} archivos de evidencia.`);
    const info = await stat(path);
    const hardMax = Math.min(Math.max(maxBytes, 1), configuredHardBytes);
    if (!info.isFile() || info.size > hardMax)
        throw new Error(`La fuente excede el presupuesto autorizado de ${hardMax} bytes.`);
    const data = await readFile(path);
    if (sha256(data) !== evidence.source_hash)
        throw new Error("La fuente cambió desde el run; cree un run nuevo antes de leer evidencia.");
    const text = data.toString("utf8"), lines = text.split(/\r?\n/u);
    const start = evidence.locator.kind === "lines" ? Math.max(1, evidence.locator.start ?? 1) : 1;
    const end = evidence.locator.kind === "lines" ? Math.min(lines.length, evidence.locator.end ?? start) : Math.min(lines.length, start + 120);
    const fragment = lines.slice(start - 1, end).join("\n");
    const redacted = String(redactValue(fragment));
    assertNoKnownSecret(redacted);
    const readBytes = Buffer.byteLength(redacted), accumulatedBytes = previousReads.reduce((total, item) => total + (typeof item.bytes === "number" ? item.bytes : 0), 0);
    if (accumulatedBytes + readBytes > configuredHardBytes)
        throw new Error(`El run excedería el límite acumulado de ${configuredHardBytes} bytes de evidencia.`);
    const audit = { read_at: new Date().toISOString(), run_id: runId, evidence_id: evidenceId, repository_id: evidence.repository_id, source_path: evidence.relative_path, start_line: start, end_line: end, bytes: readBytes, reason: "evidencia solicitada explícitamente", conclusion: "fragmento entregado; conclusión pendiente de síntesis", secrets_redacted: redacted !== fragment };
    await atomicWrite(auditPath, `${previous}${JSON.stringify(audit)}\n`);
    return { schema_version: 3, ...audit, content: redacted, repository_wide_scan: false };
}
async function ensureDocumentationIntelligence(packageRoot, config, runId) {
    const root = validatedRunRoot(config.state_root, runId);
    try {
        await access(join(root, "documentation-intelligence", "manifest.json"));
    }
    catch {
        await prepareRunDocumentation(packageRoot, config, runId);
    }
    return { root };
}
function searchTokens(value) {
    const stop = new Set(["de", "del", "el", "la", "los", "las", "para", "flujo"]);
    const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("en-US");
    const raw = normalized.split(/[^a-z0-9]+/gu).filter((token) => token.length >= 2 && !stop.has(token));
    if (/administracion|administrativo/u.test(normalized))
        raw.push("admin");
    return [...new Set(raw)];
}
function safeSegment(value) { return value.replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "") || "item"; }
function prefixMatch(left, right) { return left.length >= 4 && right.length >= 4 && (left.startsWith(right) || right.startsWith(left)); }
export async function prepareRunDocumentation(packageRoot, config, runId) {
    const requestedArtifacts = await loadRunArtifacts(config, runId);
    const { artifacts, catalog } = await composeWorkspaceArtifacts(config, requestedArtifacts);
    const skill = await loadArchifySkill(packageRoot);
    const documentedFacts = productionFacts(artifacts.facts);
    const documentedGraph = graphForFacts(artifacts.graph, documentedFacts);
    const model = createDocumentModel({ runId, title: `Arquitectura y documentación ${runId}`, snapshots: artifacts.snapshots, facts: documentedFacts, graph: documentedGraph, archifyAvailable: skill.mode === "archify", archifyVersion: skill.version });
    const serviceModels = new Map(artifacts.snapshots.map((snapshot) => {
        const repositoryId = snapshot.repository_id;
        const facts = documentedFacts.filter((fact) => fact.component_id === repositoryId || fact.component_id.startsWith(`${repositoryId}:`));
        const componentId = `component:${repositoryId}`;
        const edges = documentedGraph.edges.filter((edge) => edge.from === componentId || edge.to === componentId);
        const nodeIds = new Set([componentId, ...edges.flatMap((edge) => [edge.from, edge.to])]);
        const graph = { ...documentedGraph, snapshot_ids: [snapshot.id], nodes: documentedGraph.nodes.filter((node) => nodeIds.has(node.id)), edges };
        return [repositoryId, createDocumentModel({ runId, title: `Servicio ${repositoryId}`, snapshots: [snapshot], facts, graph, archifyAvailable: skill.mode === "archify", archifyVersion: skill.version })];
    }));
    const candidate = join(artifacts.root, "candidate-vault");
    await rm(candidate, { recursive: true, force: true });
    await buildCandidateVault(candidate, model, documentedGraph, serviceModels, documentedFacts, repositoryProfileOverrides(config.overrides));
    await atomicWrite(join(candidate, "fuentes-conocimiento.json"), `${JSON.stringify(catalog, null, 2)}\n`);
    const intelligence = await buildDocumentationIntelligence({ runId, runRoot: artifacts.root, vaultRoot: candidate, snapshots: artifacts.snapshots, facts: documentedFacts, graph: documentedGraph, ...(config.overrides === undefined ? {} : { overrides: config.overrides }) });
    await renderIntelligenceViews(candidate, intelligence.capabilities);
    const rendered = renderDocument(model);
    const issues = validateDocument(model, { facts: documentedFacts, evidence: artifacts.evidence, graph: documentedGraph, rendered });
    await atomicWrite(join(artifacts.root, "document-model.json"), `${JSON.stringify(model, null, 2)}\n`);
    await atomicWrite(join(artifacts.root, "review.json"), `${JSON.stringify({ schema_version: 3, run_id: runId, issues, unresolved_questions: [], status: issues.some((item) => item.severity === "error" || item.severity === "security") ? "review_required" : "review", archify: { skill_status: skill.status, mode: skill.mode, sha256: skill.sha256, implementation: skill.implementation } }, null, 2)}\n`);
    return { status: "review", run_id: runId, candidate_vault: candidate, issues: issues.length, blocking_issues: issues.filter((item) => item.severity === "error" || item.severity === "security").length, model_status: model.status, repository_count: artifacts.snapshots.length, repository_sources: catalog.repositories, knowledge_catalog: catalog, documentation_intelligence: { chunks: intelligence.manifest.chunks, reused_chunks: intelligence.manifest.reused_chunks, capabilities: intelligence.capabilities.length, root: intelligence.root }, archify: { skill_status: skill.status, mode: skill.mode, external_implementation: skill.implementation } };
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
export async function prepareProposal(config, runId, type, request, humanRequirements = [], options = {}) {
    if (!["specification", "migration", "adr"].includes(type))
        throw new Error(`Tipo de propuesta no soportado: ${type}`);
    if (request.trim() === "")
        throw new Error("La solicitud de propuesta está vacía.");
    const artifacts = await loadWorkspaceArtifacts(config, runId);
    const findings = findingsFromGraph(artifacts.graph);
    const proposal = createProposal({ type, findings, graph: artifacts.graph, evidence: artifacts.evidence, requestedChanges: [request.trim()], humanRequirements });
    if (options.packageRoot !== undefined)
        await ensureDocumentationIntelligence(options.packageRoot, config, runId);
    const context = options.contextId === undefined ? await prepareAnalysisContext({ runId, runRoot: artifacts.root, query: request, intent: type === "migration" ? "migration" : "development" }) : await loadContext(artifacts.root, options.contextId);
    const located = await locateCapability(artifacts.root, options.capabilityId ?? request);
    const capability = options.capabilityId === undefined ? located.matches[0]?.capability : located.matches.find((item) => item.capability.id === options.capabilityId)?.capability;
    proposal.scope = [...new Set(context.chunks.map((chunk) => chunk.repository_id).filter((id) => id !== "_workspace"))];
    proposal.current_flow = context.chunks.filter((chunk) => chunk.document_type === "flow").map((chunk) => `${chunk.repository_id}: ${chunk.heading ?? chunk.document_path}`);
    proposal.target_flow = proposal.current_flow.length > 0 ? proposal.current_flow.map((flow) => `${flow} → aplicar cambio solicitado conservando contratos observados`) : ["Flujo objetivo pendiente de confirmar con evidencia adicional."];
    proposal.changes_by_repository = proposal.scope.map((repositoryId) => ({ repository_id: repositoryId, changes: [`Evaluar e implementar en ${repositoryId} únicamente los cambios respaldados por el contexto.`], document_paths: [...new Set(context.chunks.filter((chunk) => chunk.repository_id === repositoryId).map((chunk) => chunk.document_path))] }));
    proposal.responsibilities = capability?.responsibilities.map((item) => ({ repository_id: item.repository_id, role: item.role, basis: item.basis })) ?? proposal.scope.map((repository_id) => ({ repository_id, role: "participante técnico observado", basis: "inferred" }));
    proposal.contracts = [...new Set([...proposal.contracts, ...context.chunks.flatMap((chunk) => chunk.endpoint === null ? [] : [`${chunk.endpoint.method} ${chunk.endpoint.path}`])])];
    proposal.data_and_ownership = context.chunks.filter((chunk) => /data|repository|persist|entity/iu.test(`${chunk.section_type} ${chunk.roles.join(" ")} ${chunk.source_paths.join(" ")}`)).map((chunk) => `${chunk.repository_id}: ${chunk.heading ?? chunk.document_path}`);
    proposal.reactive_behavior = [...new Set(context.chunks.flatMap((chunk) => [...chunk.content.matchAll(/\b(map|flatMap|filter|collectList|onErrorResume|switchIfEmpty|zip|then)\b/gu)].map((match) => match[1])))];
    proposal.documentary_evidence = context.chunks.map((chunk) => ({ chunk_id: chunk.id, document_path: chunk.document_path, evidence_ids: chunk.evidence_ids }));
    proposal.evidence_ids = [...new Set([...proposal.evidence_ids, ...context.chunks.flatMap((chunk) => chunk.evidence_ids)])];
    proposal.pending_decisions = [...new Set([...proposal.pending_decisions, ...context.missing_information.map((item) => `Confirmar ${item}.`)])];
    proposal.confidence = proposal.evidence_ids.length >= 5 && context.statistics.unresolved_relations === 0 ? "high" : proposal.evidence_ids.length > 0 ? "medium" : "low";
    proposal.validation = [...new Set([...proposal.validation, "Validar cada cambio contra los documentos y evidence_ids citados.", "Revisar manualmente relaciones candidate o unresolved antes de aprobar."])];
    if (options.analysisId !== undefined)
        proposal.inferences.push(`Análisis asociado: ${options.analysisId}`);
    proposal.decisions = [...new Set([...proposal.decisions, ...humanRequirements])];
    options.validator?.assert("proposal", proposal);
    const proposalId = proposalIdentifier(runId, type, request, humanRequirements, { contextId: context.context_id, capabilityId: capability?.id, analysisId: options.analysisId });
    const root = join(artifacts.root, "proposals", proposalId);
    await mkdir(root, { recursive: true });
    const jsonPath = join(root, "proposal.json");
    const markdownPath = join(root, "proposal.md");
    await atomicWrite(jsonPath, `${JSON.stringify({ proposal_id: proposalId, run_id: runId, ...proposal }, null, 2)}\n`);
    await atomicWrite(markdownPath, renderProposal(proposalId, runId, proposal));
    return { proposal_id: proposalId, status: "review_required", json_path: jsonPath, markdown_path: markdownPath, proposal, context_id: context.context_id };
}
export function proposalIdentifier(runId, type, request, humanRequirements, context = {}) {
    return stableId("proposal", runId, type, request, humanRequirements, context);
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
    const changes = proposal.changes_by_repository.map((item) => `${item.repository_id}: ${item.changes.join("; ")} [${item.document_paths.join(", ")}]`);
    const responsibilities = proposal.responsibilities.map((item) => `${item.repository_id}: ${item.role} (${item.basis})`);
    const evidence = proposal.documentary_evidence.map((item) => `${item.document_path} · chunk ${item.chunk_id}${item.evidence_ids.length > 0 ? ` · ${item.evidence_ids.join(", ")}` : ""}`);
    return `# Propuesta ${proposalId}\n\nEstado: **requiere revisión**  \nRun de evidencia: \`${runId}\`  \nTipo: \`${proposal.proposal_type}\`  \nConfianza: **${proposal.confidence}**\n\n## Objetivo\n\n${proposal.objective}\n\n${section("Alcance", proposal.scope)}${section("Exclusiones", proposal.exclusions)}${section("Hechos observados", proposal.facts)}${section("Inferencias", proposal.inferences)}${section("Decisiones humanas", proposal.decisions)}${section("Estado actual", proposal.current_state)}${section("Flujo actual", proposal.current_flow)}${section("Flujo objetivo", proposal.target_flow)}${section("Cambios propuestos", proposal.proposed_changes)}${section("Cambios por repositorio", changes)}${section("Responsabilidades por sistema", responsibilities)}${section("Componentes afectados", proposal.affected_components)}${section("Requisitos", proposal.requirements)}${section("Contratos", proposal.contracts)}${section("Datos y propiedad", proposal.data_and_ownership)}${section("Comportamiento reactivo", proposal.reactive_behavior)}${section("Fases", proposal.phases)}${section("Orden de despliegue", proposal.deployment_order)}${section("Criterios de aceptación", proposal.acceptance_criteria)}${section("Validación prevista", proposal.validation)}${section("Pruebas previstas", proposal.tests)}${section("Riesgos", proposal.risks)}${section("Rollback", proposal.rollback)}${section("Alternativas", proposal.alternatives)}${section("Decisiones pendientes", proposal.pending_decisions)}${section("Evidencia documental", evidence)}`;
}
async function renderIntelligenceViews(vaultRoot, capabilities) {
    const capabilityRows = capabilities.map((item) => `| ${item.name} | \`${item.id}\` | ${item.repositories.join(", ") || "por confirmar"} | ${item.entrypoints.join("<br>") || "—"} | ${item.confidence} |`);
    const responsibilityRows = capabilities.flatMap((item) => item.responsibilities.map((responsibility) => `| ${item.name} | ${responsibility.repository_id} | ${responsibility.role} | ${responsibility.basis} |`));
    const migrationRows = capabilities.flatMap((item) => item.legacy_dependencies.map((dependency) => `| ${item.name} | ${dependency.from} | ${dependency.to} | ${dependency.status} |`));
    await Promise.all([
        atomicWrite(join(vaultRoot, "Inteligencia", "capacidades.md"), `# Capacidades documentales\n\nVista derivada; no reemplaza la documentación técnica existente.\n\n| Capacidad | ID | Sistemas | Entradas | Confianza |\n|---|---|---|---|---|\n${capabilityRows.join("\n") || "| Sin capacidades inferidas | — | — | — | low |"}\n`),
        atomicWrite(join(vaultRoot, "Inteligencia", "responsabilidades.md"), `# Responsabilidades por capacidad\n\nLas filas \`explicit\` provienen de configuración humana; las \`extracted\` son observaciones técnicas.\n\n| Capacidad | Sistema | Responsabilidad | Base |\n|---|---|---|---|\n${responsibilityRows.join("\n") || "| Por confirmar | — | — | — |"}\n`),
        atomicWrite(join(vaultRoot, "Inteligencia", "migraciones.md"), `# Estado de migraciones\n\n| Capacidad | Origen | Destino | Estado |\n|---|---|---|---|\n${migrationRows.join("\n") || "| Sin migraciones configuradas | — | — | unresolved |"}\n`),
        atomicWrite(join(vaultRoot, "Inteligencia", "analisis-impacto.md"), "# Análisis de impacto\n\nLos análisis se generan bajo demanda con `docsys_analyze_change` y permanecen en el estado privado del run para revisión. Esta vista no inventa estimaciones de tiempo o dinero.\n"),
    ]);
}
async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }
//# sourceMappingURL=run_services.js.map