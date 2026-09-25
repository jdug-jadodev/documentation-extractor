import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { ContractValidator } from "./contracts/validator.js";
import { configurationState, loadConfiguration } from "./config.js";
import { runDeterministicScenario } from "./engine.js";
import { analyzeRunChange, assessRunMigration, expandRunDocumentContext, explainRelations, explainRunResponsibilities, findDocumentableFlows, investigateRunFlow, loadRunArtifacts, loadWorkspaceArtifacts, locateRunCapability, prepareAndPublishDocumentation, prepareFlowDocumentation, prepareProposal, prepareRunAnalysisContext, queryRunArtifacts, readRunSourceEvidence, searchRunDocumentation, traceFlow, traceRunBusinessFlow } from "./run_services.js";
import { explainEndpointFromFacts, explainServiceFromFacts } from "./documentation/semantic.js";
import type { QueryCategory } from "./query.js";
import type { ProposalType } from "./proposal/model.js";
import { stageProposalDraft } from "./publication/draft.js";
import { refreshKnowledge } from "./refresh.js";

export interface McpOptions { packageRoot: string; configPath: string; }

export async function buildDocumentationMcp(options: McpOptions): Promise<McpServer> {
  const validator = await ContractValidator.create(options.packageRoot);
  const server = new McpServer({ name: "sistema-documentacion", version: "4.0.0" });

  server.registerTool("docsys_status", {
    description: "Consulta el estado local del sistema sin analizar repositorios ni invocar IA.",
    inputSchema: z.object({}),
  }, async () => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return { schema_version: 3, configuration: await configurationState(config), repositories: config.repositories.map((repo) => ({ id: repo.id, enabled: repo.enabled, default_branch: repo.default_branch })), azure_enabled: config.azure.enabled, automatic_analysis: false };
  }));

  server.registerTool("docsys_list_repositories", {
    description: "Lista solo los repositorios declarados en knowledge.yaml. No explora otras carpetas.",
    inputSchema: z.object({}),
  }, async () => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return { configuration: await configurationState(config), repositories: config.repositories.map((repo) => ({ id: repo.id, enabled: repo.enabled, default_branch: repo.default_branch })) };
  }));

  server.registerTool("docsys_prepare_analysis", {
    description: "Crea bajo demanda un run determinista para uno o varios repositorios configurados. No usa IA, no aprueba y no publica.",
    inputSchema: z.object({ repositories: z.array(z.string().min(1)).min(1), refs: z.record(z.string(), z.string()).optional() }),
  }, async ({ repositories, refs }) => toolResult(async () => {
    const result = await runDeterministicScenario({ packageRoot: options.packageRoot, configPath: options.configPath, repositoryIds: repositories, ...(refs === undefined ? {} : { refs }), validator });
    return { schema_version: 3, status: "review", run_id: result.run_id, repositories: result.repositories.map((item) => ({ id: item.repository_id, ref: item.snapshot.requested_ref, commit: item.snapshot.commit_oid, facts: item.bundle.facts.length, quality: item.bundle.quality })), relations: result.graph.edges.length, ai_invocations: 0, published: false };
  }));

  server.registerTool("docsys_refresh_knowledge", {
    description: "Sincroniza de forma segura las ramas configuradas (fetch + pull --ff-only), compara commits, reanaliza solo archivos afectados, reconstruye relaciones y reemplaza la documentación vigente en Obsidian. No usa IA ni cambia de rama.",
    inputSchema: z.object({
      repositories: z.array(z.string().min(1)).min(1).optional(),
      refs: z.record(z.string(), z.string()).optional(),
      sync_remote: z.boolean().optional(),
      publish: z.boolean().optional(),
    }),
  }, async ({ repositories, refs, sync_remote, publish }) => toolResult(async () => await refreshKnowledge({
    packageRoot: options.packageRoot,
    configPath: options.configPath,
    validator,
    ...(repositories === undefined ? {} : { repositoryIds: repositories }),
    ...(refs === undefined ? {} : { refs }),
    ...(sync_remote === undefined ? {} : { syncRemote: sync_remote }),
    ...(publish === undefined ? {} : { publish }),
  })));

  server.registerTool("docsys_explain_relation", {
    description: "Explica relaciones respaldadas por un run existente; puede filtrar origen y destino.",
    inputSchema: z.object({ run_id: z.string().min(1), from: z.string().min(1).optional(), to: z.string().min(1).optional() }),
  }, async ({ run_id, from, to }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    const artifacts = await loadRunArtifacts(config, run_id);
    return explainRelations(artifacts.graph, run_id, from, to);
  }));

  server.registerTool("docsys_trace_flow", {
    description: "Traza caminos dirigidos entre dos componentes usando el grafo de un run existente.",
    inputSchema: z.object({ run_id: z.string().min(1), from: z.string().min(1), to: z.string().min(1), max_depth: z.number().int().min(1).max(30).optional() }),
  }, async ({ run_id, from, to, max_depth }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    const artifacts = await loadRunArtifacts(config, run_id);
    return traceFlow(artifacts.graph, run_id, from, to, max_depth);
  }));

  server.registerTool("docsys_query", {
    description: "Consulta hechos ya extraídos de un run sin volver a analizar los repositorios.",
    inputSchema: z.object({ run_id: z.string().min(1), category: z.enum(["endpoints", "dependencies", "messages", "data", "architecture", "technologies", "coverage", "evidence"]), component: z.string().optional(), offset: z.number().int().min(0).optional(), limit: z.number().int().min(1).max(1000).optional() }),
  }, async ({ run_id, category, component, offset, limit }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    const artifacts = await loadRunArtifacts(config, run_id);
    return { schema_version: 3, run_id, ...queryRunArtifacts(artifacts, category as QueryCategory, { ...(component === undefined ? {} : { repositoryId: component, componentId: component }), ...(offset === undefined ? {} : { offset }), ...(limit === undefined ? {} : { limit }) }) };
  }));

  server.registerTool("docsys_explain_service", {
    description: "Devuelve una explicación compacta y precalculada de un servicio: tecnologías, endpoints, relaciones, clases y métodos. No reanaliza código ni envía cientos de hechos a Copilot.",
    inputSchema: z.object({ run_id: z.string().min(1), component: z.string().min(1), symbol_limit: z.number().int().min(1).max(200).optional() }),
  }, async ({ run_id, component, symbol_limit }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    const artifacts = await loadWorkspaceArtifacts(config, run_id);
    return explainServiceFromFacts(run_id, component, artifacts.facts, artifacts.graph, symbol_limit ?? 80);
  }));

  server.registerTool("docsys_explain_endpoint", {
    description: "Explica un endpoint desde su flujo AST precalculado: handler, clases, métodos, llamadas, datos e integraciones. No vuelve a leer ni analizar el repositorio.",
    inputSchema: z.object({ run_id: z.string().min(1), component: z.string().min(1), method: z.string().min(1), path: z.string().min(1) }),
  }, async ({ run_id, component, method, path }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    const artifacts = await loadWorkspaceArtifacts(config, run_id);
    return explainEndpointFromFacts(run_id, component, method, path, artifacts.facts);
  }));

  server.registerTool("docsys_find_flows", {
    description: "Localiza flujos HTTP en hechos ya indexados mediante una frase, ruta o handler. No lee ni busca en repositorios y no invoca IA.",
    inputSchema: z.object({ run_id: z.string().min(1), component: z.string().min(1), query: z.string().min(1), limit: z.number().int().min(1).max(100).optional() }),
  }, async ({ run_id, component, query, limit }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    const artifacts = await loadWorkspaceArtifacts(config, run_id);
    const candidates = findDocumentableFlows(component, query, artifacts.facts, limit ?? 20);
    return { schema_version: 3, run_id, component, query, candidates, total: candidates.length, repository_reads: 0, ai_invocations: 0 };
  }));

  server.registerTool("docsys_document_flow", {
    description: "Genera un único Markdown de flujo desde hechos y AST ya indexados y lo guarda en Consultas de Obsidian. No lee el repositorio, no reanaliza y no genera la documentación completa.",
    inputSchema: z.object({ run_id: z.string().min(1), component: z.string().min(1), method: z.string().min(1), path: z.string().min(1) }),
  }, async ({ run_id, component, method, path }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return await prepareFlowDocumentation(config, run_id, component, method, path);
  }));

  server.registerTool("docsys_search_documentation", {
    description: "Busca secciones semánticas de la documentación ya generada. No lee repositorios ni invoca IA.",
    inputSchema: z.object({ run_id: z.string().min(1), query: z.string().min(1), repository: z.string().min(1).optional(), limit: z.number().int().min(1).max(100).optional() }),
  }, async ({ run_id, query, repository, limit }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return await searchRunDocumentation(options.packageRoot, config, run_id, query, repository, limit);
  }));

  server.registerTool("docsys_expand_document_context", {
    description: "Expande chunks seleccionados mediante wikilinks y relaciones técnicas, sin leer código fuente.",
    inputSchema: z.object({ run_id: z.string().min(1), chunk_ids: z.array(z.string().min(1)).min(1).max(40), depth: z.number().int().min(1).max(5).optional(), limit: z.number().int().min(1).max(200).optional() }),
  }, async ({ run_id, chunk_ids, depth, limit }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return await expandRunDocumentContext(options.packageRoot, config, run_id, chunk_ids, depth, limit);
  }));

  server.registerTool("docsys_prepare_analysis_context", {
    description: "Compila un contexto pequeño, deduplicado y trazable para desarrollo, migración, impacto o responsabilidades.",
    inputSchema: z.object({ run_id: z.string().min(1), query: z.string().min(1), intent: z.enum(["development", "migration", "impact", "responsibilities"]), repository: z.string().min(1).optional() }),
  }, async ({ run_id, query, intent, repository }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return await prepareRunAnalysisContext(options.packageRoot, config, run_id, query, intent, repository);
  }));

  server.registerTool("docsys_locate_capability", {
    description: "Localiza una capacidad funcional y sus sistemas usando el índice documental.",
    inputSchema: z.object({ run_id: z.string().min(1), query: z.string().min(1) }),
  }, async ({ run_id, query }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return await locateRunCapability(options.packageRoot, config, run_id, query);
  }));

  server.registerTool("docsys_trace_business_flow", {
    description: "Reconstruye un flujo funcional multi-repositorio desde documentación y relaciones indexadas.",
    inputSchema: z.object({ run_id: z.string().min(1), query: z.string().min(1) }),
  }, async ({ run_id, query }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return await traceRunBusinessFlow(options.packageRoot, config, run_id, query);
  }));

  server.registerTool("docsys_explain_responsibilities", {
    description: "Explica responsabilidades extraídas y decisiones humanas explícitas por sistema, con confianza y evidencia.",
    inputSchema: z.object({ run_id: z.string().min(1), query: z.string().min(1) }),
  }, async ({ run_id, query }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return await explainRunResponsibilities(options.packageRoot, config, run_id, query);
  }));

  server.registerTool("docsys_analyze_change", {
    description: "Analiza alcance, impacto, criticidad e incertidumbre sin inventar tiempo ni costo.",
    inputSchema: z.object({ run_id: z.string().min(1), request: z.string().min(1), context_id: z.string().min(1).optional() }),
  }, async ({ run_id, request, context_id }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return await analyzeRunChange(options.packageRoot, config, run_id, request, context_id);
  }));

  server.registerTool("docsys_assess_migration", {
    description: "Evalúa una migración, dependencias heredadas, transición y rollback desde contexto documental.",
    inputSchema: z.object({ run_id: z.string().min(1), request: z.string().min(1), context_id: z.string().min(1).optional(), from: z.string().min(1).optional(), to: z.string().min(1).optional() }),
  }, async ({ run_id, request, context_id, from, to }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return await assessRunMigration(options.packageRoot, config, run_id, request, { ...(context_id === undefined ? {} : { contextId: context_id }), ...(from === undefined ? {} : { from }), ...(to === undefined ? {} : { to }) });
  }));

  server.registerTool("docsys_investigate_flow", {
    description: "Aplica escalamiento progresivo a un flujo; nunca inicia automáticamente un escaneo general.",
    inputSchema: z.object({ run_id: z.string().min(1), query: z.string().min(1), level: z.number().int().min(1).max(6).optional() }),
  }, async ({ run_id, query, level }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return await investigateRunFlow(options.packageRoot, config, run_id, query, level);
  }));

  server.registerTool("docsys_read_source_evidence", {
    description: "Lee un único fragmento productivo autorizado por evidence_id, con presupuesto, hash, redacción y auditoría.",
    inputSchema: z.object({ run_id: z.string().min(1), evidence_id: z.string().min(1), max_bytes: z.number().int().min(1).max(1048576).optional() }),
  }, async ({ run_id, evidence_id, max_bytes }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return await readRunSourceEvidence(config, run_id, evidence_id, max_bytes);
  }));

  server.registerTool("docsys_prepare_proposal", {
    description: "Prepara un borrador determinista desde contexto documental trazable. Siempre queda pendiente de revisión; no modifica aplicaciones.",
    inputSchema: z.object({ run_id: z.string().min(1), type: z.enum(["specification", "migration", "adr"]), request: z.string().min(1), requirements: z.array(z.string()).optional(), context_id: z.string().min(1).optional(), capability_id: z.string().min(1).optional(), analysis_id: z.string().min(1).optional() }),
  }, async ({ run_id, type, request, requirements, context_id, capability_id, analysis_id }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    const result = await prepareProposal(config, run_id, type as ProposalType, request, requirements ?? [], { packageRoot: options.packageRoot, validator, ...(context_id === undefined ? {} : { contextId: context_id }), ...(capability_id === undefined ? {} : { capabilityId: capability_id }), ...(analysis_id === undefined ? {} : { analysisId: analysis_id }) });
    const obsidian_draft = await stageProposalDraft(config.vault_root, run_id, result.proposal_id, result.markdown_path);
    return { ...result, obsidian_draft };
  }));

  server.registerTool("docsys_prepare_documentation", {
    description: "Genera, valida y publica automáticamente en Obsidian la documentación final de un run. Incluye arquitectura general, diagramas por servicio y Mermaid por endpoint, clases, métodos, utilitarios y relaciones entre sistemas.",
    inputSchema: z.object({ run_id: z.string().min(1) }),
  }, async ({ run_id }) => toolResult(async () => {
    const config = await loadConfiguration(options.configPath, validator);
    return await prepareAndPublishDocumentation(options.packageRoot, config, run_id);
  }));

  return server;
}

export async function serveDocumentationMcp(options: McpOptions): Promise<void> {
  await serveStdio(async () => await buildDocumentationMcp(options));
}

async function toolResult(operation: () => Promise<unknown>) {
  try {
    const value = await operation();
    return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], structuredContent: asStructured(value) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { isError: true, content: [{ type: "text" as const, text: message }], structuredContent: { status: "failed", error: message } };
  }
}

function asStructured(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : { value };
}
