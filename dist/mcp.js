import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { ContractValidator } from "./contracts/validator.js";
import { configurationState, loadConfiguration } from "./config.js";
import { runDeterministicScenario } from "./engine.js";
import { explainRelations, loadRunArtifacts, prepareAndPublishDocumentation, prepareProposal, queryRunArtifacts, traceFlow } from "./run_services.js";
import { stageProposalDraft } from "./publication/draft.js";
export async function buildDocumentationMcp(options) {
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
        return { schema_version: 3, run_id, ...queryRunArtifacts(artifacts, category, { ...(component === undefined ? {} : { repositoryId: component, componentId: component }), ...(offset === undefined ? {} : { offset }), ...(limit === undefined ? {} : { limit }) }) };
    }));
    server.registerTool("docsys_prepare_proposal", {
        description: "Prepara un borrador determinista de especificación, migración o ADR basado en un run. Siempre queda pendiente de revisión; no modifica aplicaciones.",
        inputSchema: z.object({ run_id: z.string().min(1), type: z.enum(["specification", "migration", "adr"]), request: z.string().min(1), requirements: z.array(z.string()).optional() }),
    }, async ({ run_id, type, request, requirements }) => toolResult(async () => {
        const config = await loadConfiguration(options.configPath, validator);
        const result = await prepareProposal(config, run_id, type, request, requirements ?? []);
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
export async function serveDocumentationMcp(options) {
    await serveStdio(async () => await buildDocumentationMcp(options));
}
async function toolResult(operation) {
    try {
        const value = await operation();
        return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: asStructured(value) };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { isError: true, content: [{ type: "text", text: message }], structuredContent: { status: "failed", error: message } };
    }
}
function asStructured(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : { value };
}
//# sourceMappingURL=mcp.js.map