import { resolve } from "node:path";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { assertSupportedNode, handleScriptError, packageRoot } from "./shared.mjs";

function argument(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }

async function main() {
  assertSupportedNode();
  const configPath = resolve(argument("--config") ?? "knowledge.yaml"), runId = argument("--run"), query = argument("--query") ?? "permisos de administración";
  if (!runId) throw new Error("Falta --run.");
  const [{ ContractValidator }, { loadConfiguration }, services] = await Promise.all([
    import(pathToFileURL(resolve(packageRoot, "dist/contracts/validator.js")).href),
    import(pathToFileURL(resolve(packageRoot, "dist/config.js")).href),
    import(pathToFileURL(resolve(packageRoot, "dist/run_services.js")).href),
  ]);
  const validator = await ContractValidator.create(packageRoot), config = await loadConfiguration(configPath, validator);
  const search = await services.searchRunDocumentation(packageRoot, config, runId, query, undefined, 12);
  const context = await services.prepareRunAnalysisContext(packageRoot, config, runId, query, "development");
  const capability = await services.locateRunCapability(packageRoot, config, runId, query);
  const flow = await services.traceRunBusinessFlow(packageRoot, config, runId, query);
  const impact = await services.analyzeRunChange(packageRoot, config, runId, query, context.context_id);
  const migration = await services.assessRunMigration(packageRoot, config, runId, `Migrar ${query}`, { contextId: context.context_id, from: "core", to: "micro-identidad" });
  const investigation = await services.investigateRunFlow(packageRoot, config, runId, query, 3);
  const proposal = await services.prepareProposal(config, runId, "specification", `Proponer desarrollo para ${query}`, [], { packageRoot, contextId: context.context_id, capabilityId: capability.matches[0]?.capability.id, analysisId: impact.analysis_id, validator });
  const corpus = context.chunks.map((chunk) => `${chunk.heading ?? ""}\n${chunk.document_path}\n${chunk.source_paths.join("\n")}\n${chunk.content}`).join("\n");
  const requiredSymbols = ["InspectorRouter", "InspectorHandler", "InspectorMapperDto", "InspectorDomainUseCase", "InspectorRepositoryPortOut", "InspectorsRepository", "InspectorR2dbcRepository", "InspectorMapper", "InspectorEntity"];
  const missingSymbols = requiredSymbols.filter((symbol) => !corpus.includes(symbol));
  if (missingSymbols.length > 0) throw new Error(`El contexto real no incluye: ${missingSymbols.join(", ")}.`);
  if (context.statistics.estimated_tokens > 15_000) throw new Error("El contexto real excede 15.000 tokens estimados.");
  if (context.chunks.some((chunk) => /(?:^|\/)src\/test\/|(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|\.(?:test|spec)\./iu.test(`${chunk.document_path} ${chunk.source_paths.join(" ")}`))) throw new Error("El contexto real incluyó documentación de pruebas.");
  if (capability.matches[0]?.capability.id !== "permisos-admin") throw new Error("No se priorizó la capacidad permisos-admin.");
  await Promise.all([access(join(config.state_root, "runs", runId, "documentation-intelligence", "analyses", `${impact.analysis_id}.json`)), access(join(config.state_root, "runs", runId, "documentation-intelligence", "migrations", `${migration.migration_id}.json`))]);
  process.stdout.write(`${JSON.stringify({ run_id: runId, query, search_results: search.results.length, top_documents: [...new Set(search.results.map((item) => item.chunk.document_path))], context_id: context.context_id, context_chunks: context.chunks.length, context_documents: context.statistics.documents_selected, context_tokens: context.statistics.estimated_tokens, repositories: context.statistics.repositories_represented, missing_information: context.missing_information, required_symbols: Object.fromEntries(requiredSymbols.map((symbol) => [symbol, true])), capability: capability.matches[0]?.capability ?? null, flow_steps: flow.steps.length, impact: { id: impact.analysis_id, complexity: impact.complexity, criticality: impact.criticality, confidence: impact.confidence }, migration: { id: migration.migration_id, status: migration.status, from: migration.from, to: migration.to }, investigation: { facts: investigation.directed_analysis.fact_ids.length, authorized_evidence: investigation.authorized_evidence.length, repository_wide_scan: investigation.repository_wide_scan, repository_reads: investigation.repository_reads }, proposal: { id: proposal.proposal_id, path: proposal.markdown_path, confidence: proposal.proposal.confidence, evidence: proposal.proposal.documentary_evidence.length }, repository_reads: 0 }, null, 2)}\n`);
}

main().catch(handleScriptError);
