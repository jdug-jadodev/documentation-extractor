import { access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertSupportedNode, handleScriptError, packageRoot } from "./shared.mjs";

function argument(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }

async function main() {
  assertSupportedNode();
  const configPath = resolve(argument("--config") ?? "knowledge.yaml"), runId = argument("--run");
  if (!runId) throw new Error("Falta --run.");
  const [{ ContractValidator }, { loadConfiguration }, services, intelligence] = await Promise.all([
    import(pathToFileURL(resolve(packageRoot, "dist/contracts/validator.js")).href),
    import(pathToFileURL(resolve(packageRoot, "dist/config.js")).href),
    import(pathToFileURL(resolve(packageRoot, "dist/run_services.js")).href),
    import(pathToFileURL(resolve(packageRoot, "dist/intelligence/index.js")).href),
  ]);
  const validator = await ContractValidator.create(packageRoot), config = await loadConfiguration(configPath, validator);
  const artifacts = await services.loadWorkspaceArtifacts(config, runId), vaultRoot = join(artifacts.root, "candidate-vault");
  await access(vaultRoot);
  const result = await intelligence.buildDocumentationIntelligence({ runId, runRoot: artifacts.root, vaultRoot, snapshots: artifacts.snapshots, facts: artifacts.facts, graph: artifacts.graph, ...(config.overrides === undefined ? {} : { overrides: config.overrides }) });
  process.stdout.write(`${JSON.stringify({ run_id: runId, chunks: result.manifest.chunks, reused_chunks: result.manifest.reused_chunks, capabilities: result.capabilities.length, repository_reads: 0 }, null, 2)}\n`);
}

main().catch(handleScriptError);
