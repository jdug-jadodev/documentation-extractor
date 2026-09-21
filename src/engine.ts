import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ContractValidator } from "./contracts/validator.js";
import type { FactBundle } from "./bundles.js";
import { loadConfiguration, configurationState } from "./config.js";
import { preflight } from "./preflight.js";
import { GitSnapshotReader } from "./snapshots/git_reader.js";
import { WorkingTreeSnapshotReader } from "./snapshots/working_tree.js";
import { buildInventory } from "./discovery/inventory.js";
import { PluginRegistry } from "./extractors/registry.js";
import { buildBundle } from "./bundles.js";
import { buildGraph } from "./correlation/graph.js";
import type { Inventory, KnowledgeGraph, Scenario, Snapshot, SnapshotReader } from "./contracts/types.js";
import { stableId } from "./platform/hash.js";
import { atomicWrite } from "./platform/fs.js";

export interface RepositoryExtraction {
  repository_id: string;
  snapshot: Snapshot;
  inventory: Inventory;
  bundle: FactBundle;
}

export interface DeterministicScenarioRun {
  run_id: string;
  repositories: RepositoryExtraction[];
  graph: KnowledgeGraph;
  run_root: string;
  ai_invocations: 0;
}

export interface DeterministicRun extends DeterministicScenarioRun {
  snapshot: Snapshot;
  inventory: Inventory;
  bundle: FactBundle;
}

export async function runDeterministicScenario(input: {
  packageRoot: string;
  configPath: string;
  repositoryIds: readonly string[];
  refs?: Readonly<Record<string, string>>;
  workingTreePaths?: Readonly<Record<string, readonly string[]>>;
  validator: ContractValidator;
  signal?: AbortSignal;
}): Promise<DeterministicScenarioRun> {
  const repositoryIds = [...new Set(input.repositoryIds.map((id) => id.trim()).filter(Boolean))];
  if (repositoryIds.length === 0) throw Object.assign(new Error("Seleccione al menos un repositorio."), { exitCode: 2 });
  const config = await loadConfiguration(input.configPath, input.validator);
  if (await configurationState(config) === "configuration_pending") throw Object.assign(new Error("Configuración pendiente"), { code: "CONFIGURATION_PENDING", exitCode: 2 });
  const report = await preflight(config, repositoryIds);
  if (report.status !== "ready" || report.git_executable === null) throw Object.assign(new Error(report.issues.map((issue) => issue.message).join("; ")), { exitCode: 2 });

  const extractions: RepositoryExtraction[] = [];
  for (const repositoryId of repositoryIds) {
    const repository = config.repositories.find((item) => item.id === repositoryId);
    const ready = report.repositories.find((item) => item.id === repositoryId);
    if (!repository || !ready) throw new Error(`Repositorio no autorizado: ${repositoryId}`);
    const ref = input.refs?.[repositoryId] ?? repository.default_branch;
    if (!ref) throw Object.assign(new Error(`La rama de ${repositoryId} no está configurada; seleccione una explícitamente.`), { exitCode: 3 });
    const committedReader = await GitSnapshotReader.create({ git: report.git_executable, root: ready.real_root, repositoryId, requestedRef: ref, ...(input.signal === undefined ? {} : { signal: input.signal }) });
    const selectedLocalPaths = input.workingTreePaths?.[repositoryId];
    const reader: SnapshotReader = selectedLocalPaths === undefined
      ? committedReader
      : await WorkingTreeSnapshotReader.capture({ root: ready.real_root, repositoryId, baseCommit: committedReader.snapshot.commit_oid, paths: selectedLocalPaths, ...(input.signal === undefined ? {} : { signal: input.signal }) });
    const inventory = await buildInventory(reader);
    const registry = new PluginRegistry();
    const results = [];
    for (const plugin of registry.list()) {
      for (const candidate of await plugin.detect(inventory)) {
        results.push(await plugin.extract(reader, candidate, { max_file_bytes: 2 * 1024 * 1024, grammar_root: join(input.packageRoot, "assets", "grammars"), ...(input.signal === undefined ? {} : { signal: input.signal }) }));
      }
    }
    extractions.push({ repository_id: repositoryId, snapshot: reader.snapshot, inventory, bundle: buildBundle(reader.snapshot, results, inventory.coverage) });
  }

  const aliases = readAliases(config.overrides);
  const snapshots = extractions.map((item) => item.snapshot);
  const scenario: Scenario = {
    schema_version: 3,
    id: stableId("scenario", snapshots.map((snapshot) => snapshot.id), aliases),
    snapshots: snapshots.map((snapshot) => ({ repository_id: snapshot.repository_id, snapshot_id: snapshot.id })),
    environment: null,
    aliases,
  };
  const graph = buildGraph(extractions.flatMap((item) => item.bundle.facts), scenario);
  const suffix = repositoryIds.length === 1 ? repositoryIds[0]! : `scenario-${stableId(repositoryIds.join("\u0000")).slice(0, 10)}`;
  const runId = `run-${new Date().toISOString().replace(/[:.]/gu, "-")}-${suffix}`;
  const runRoot = join(config.config_root, ".knowledge", "runs", runId);
  await mkdir(runRoot, { recursive: true });
  await atomicWrite(join(runRoot, "workspace.json"), `${JSON.stringify(report, null, 2)}\n`);
  await atomicWrite(join(runRoot, "scenario.json"), `${JSON.stringify(scenario, null, 2)}\n`);
  for (const extraction of extractions) {
    const repoRoot = join(runRoot, extraction.repository_id);
    await mkdir(join(repoRoot, "facts"), { recursive: true });
    await atomicWrite(join(repoRoot, "inventory.json"), `${JSON.stringify(extraction.inventory, null, 2)}\n`);
    await atomicWrite(join(repoRoot, "bundle.json"), `${JSON.stringify(extraction.bundle, null, 2)}\n`);
    await atomicWrite(join(repoRoot, "evidence.json"), `${JSON.stringify(extraction.bundle.evidence, null, 2)}\n`);
    await atomicWrite(join(repoRoot, "facts", "all.json"), `${JSON.stringify(extraction.bundle.facts, null, 2)}\n`);
  }
  await atomicWrite(join(runRoot, "graph.json"), `${JSON.stringify(graph, null, 2)}\n`);
  await atomicWrite(join(runRoot, "run.json"), `${JSON.stringify({
    schema_version: 3,
    run_id: runId,
    status: "review",
    snapshots,
    tasks: [
      ...repositoryIds.flatMap((id) => [{ id: `inventory:${id}`, status: "completed" }, { id: `extract:${id}`, status: "completed" }]),
      { id: "graph", status: "completed" },
    ],
    usage: { ai_invocations: 0, provider_turns: null, input_tokens: null, output_tokens: null, provider_amount: null, unit: null, source: "deterministic", observation_scope: runId, observed_at: new Date().toISOString() },
  }, null, 2)}\n`);
  return { run_id: runId, repositories: extractions, graph, run_root: runRoot, ai_invocations: 0 };
}

export async function runDeterministicExtraction(input: {
  packageRoot: string;
  configPath: string;
  repositoryId: string;
  ref?: string;
  validator: ContractValidator;
  signal?: AbortSignal;
}): Promise<DeterministicRun> {
  const refs = input.ref === undefined ? undefined : { [input.repositoryId]: input.ref };
  const scenario = await runDeterministicScenario({ packageRoot: input.packageRoot, configPath: input.configPath, repositoryIds: [input.repositoryId], ...(refs === undefined ? {} : { refs }), validator: input.validator, ...(input.signal === undefined ? {} : { signal: input.signal }) });
  const only = scenario.repositories[0];
  if (!only) throw new Error("La extracción no produjo repositorios.");
  return { ...scenario, snapshot: only.snapshot, inventory: only.inventory, bundle: only.bundle };
}

function readAliases(overrides: Record<string, unknown> | undefined): Record<string, string> {
  const aliases = overrides?.aliases;
  if (!aliases || typeof aliases !== "object" || Array.isArray(aliases)) return {};
  return Object.fromEntries(Object.entries(aliases as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}
