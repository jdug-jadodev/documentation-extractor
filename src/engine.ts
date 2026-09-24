import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ContractValidator } from "./contracts/validator.js";
import type { FactBundle } from "./bundles.js";
import { loadConfiguration, configurationState } from "./config.js";
import { preflight } from "./preflight.js";
import { GitSnapshotReader } from "./snapshots/git_reader.js";
import { WorkingTreeSnapshotReader } from "./snapshots/working_tree.js";
import { buildIncrementalInventory, buildInventory } from "./discovery/inventory.js";
import { PluginRegistry } from "./extractors/registry.js";
import { buildBundle } from "./bundles.js";
import { buildGraph } from "./correlation/graph.js";
import { resolveSourceSemanticFacts } from "./extractors/source_architecture/index.js";
import type { Diagnostic, Evidence, ExtractionResult, Fact, Inventory, KnowledgeGraph, Scenario, Snapshot, SnapshotReader } from "./contracts/types.js";
import { stableId } from "./platform/hash.js";
import { atomicWrite } from "./platform/fs.js";

export interface RepositoryExtraction {
  repository_id: string;
  snapshot: Snapshot;
  inventory: Inventory;
  bundle: FactBundle;
  update: { mode: "full" | "incremental" | "reused"; changed_paths: string[]; reprocessed_paths: string[]; reused_files: number };
}

export interface IncrementalScenarioOptions {
  baseline_run_id: string;
  changed_paths: Readonly<Record<string, readonly string[]>>;
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
  incremental?: IncrementalScenarioOptions;
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
    const registry = new PluginRegistry();
    const fingerprint = extractorFingerprint(registry);
    const baseline = selectedLocalPaths === undefined && input.incremental !== undefined
      ? await loadBaseline(config.state_root, input.incremental.baseline_run_id, repositoryId)
      : null;
    const requestedChanges = [...new Set(input.incremental?.changed_paths[repositoryId] ?? [])].sort();
    if (baseline !== null && baseline.snapshot.id === reader.snapshot.id && requestedChanges.length === 0) {
      extractions.push({ repository_id: repositoryId, snapshot: reader.snapshot, inventory: baseline.inventory, bundle: baseline.bundle, update: { mode: "reused", changed_paths: [], reprocessed_paths: [], reused_files: baseline.inventory.files.length } });
      continue;
    }
    const canIncrement = baseline !== null
      && baseline.extractor_fingerprint === fingerprint
      && baseline.snapshot.requested_ref === reader.snapshot.requested_ref
      && !requestedChanges.some(isStructuralPath);
    const invalidatedPaths = canIncrement ? expandInvalidatedPaths(new Set(requestedChanges), baseline.bundle) : new Set<string>();
    const inventory = canIncrement
      ? await buildIncrementalInventory(reader, baseline.inventory, invalidatedPaths)
      : await buildInventory(reader);
    const results: ExtractionResult[] = [];
    for (const plugin of registry.list()) {
      for (const candidate of await plugin.detect(inventory)) {
        results.push(await plugin.extract(reader, candidate, {
          max_file_bytes: 2 * 1024 * 1024,
          grammar_root: join(input.packageRoot, "assets", "grammars"),
          ...(canIncrement ? { include_paths: invalidatedPaths } : {}),
          ...(input.signal === undefined ? {} : { signal: input.signal }),
        }));
      }
    }
    const bundle = canIncrement
      ? mergeIncrementalBundle(reader.snapshot, baseline.bundle, results, inventory, invalidatedPaths)
      : buildBundle(reader.snapshot, results, inventory.coverage);
    const currentPaths = new Set(inventory.files.map((file) => file.relative_path));
    extractions.push({
      repository_id: repositoryId,
      snapshot: reader.snapshot,
      inventory,
      bundle,
      update: {
        mode: canIncrement ? "incremental" : "full",
        changed_paths: requestedChanges,
        reprocessed_paths: canIncrement ? [...invalidatedPaths].filter((path) => currentPaths.has(path)).sort() : inventory.files.map((file) => file.relative_path),
        reused_files: canIncrement ? inventory.files.filter((file) => !invalidatedPaths.has(file.relative_path)).length : 0,
      },
    });
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
  const suffix = repositoryIds.length === 1 ? repositoryIds[0]! : `scenario-${stableId("repositories", repositoryIds).slice(-10)}`;
  const runId = `run-${new Date().toISOString().replace(/[:.]/gu, "-")}-${suffix}`;
  const runRoot = join(config.state_root, "runs", runId);
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
    extractor_fingerprint: extractorFingerprint(new PluginRegistry()),
    incremental_base_run_id: input.incremental?.baseline_run_id ?? null,
    repository_updates: Object.fromEntries(extractions.map((item) => [item.repository_id, item.update])),
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

interface BaselineArtifacts {
  snapshot: Snapshot;
  inventory: Inventory;
  bundle: FactBundle;
  extractor_fingerprint: string | null;
}

async function loadBaseline(stateRoot: string, runId: string, repositoryId: string): Promise<BaselineArtifacts | null> {
  if (!/^run-[A-Za-z0-9._-]+$/u.test(runId)) throw new Error("run_id base inválido.");
  try {
    const root = join(stateRoot, "runs", runId);
    const run = JSON.parse(await readFile(join(root, "run.json"), "utf8")) as { snapshots?: Snapshot[]; extractor_fingerprint?: string };
    const snapshot = run.snapshots?.find((item) => item.repository_id === repositoryId);
    if (snapshot === undefined) return null;
    const inventory = JSON.parse(await readFile(join(root, repositoryId, "inventory.json"), "utf8")) as Inventory;
    const bundle = JSON.parse(await readFile(join(root, repositoryId, "bundle.json"), "utf8")) as FactBundle;
    if (inventory.snapshot_id !== snapshot.id || bundle.snapshot_id !== snapshot.id) throw new Error(`La base incremental de ${repositoryId} es inconsistente.`);
    return { snapshot, inventory, bundle, extractor_fingerprint: run.extractor_fingerprint ?? null };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function extractorFingerprint(registry: PluginRegistry): string {
  return stableId("extractors", registry.list().map((plugin) => ({ id: plugin.id, version: plugin.version, rules: plugin.rule_versions })));
}

function isStructuralPath(path: string): boolean {
  return /(^|\/)(?:package\.json|angular\.json|pom\.xml|build\.gradle(?:\.kts)?|pyproject\.toml|requirements\.txt|web\.xml|weblogic\.xml|application\.xml|[^/]+\.csproj)$/iu.test(path);
}

function expandInvalidatedPaths(initial: Set<string>, baseline: FactBundle): Set<string> {
  const result = new Set(initial);
  let changed = true;
  while (changed) {
    changed = false;
    for (const fact of baseline.facts) {
      if (fact.kind !== "module_dependency" || fact.value === null || typeof fact.value !== "object" || Array.isArray(fact.value)) continue;
      const source = typeof fact.value.source_path === "string" ? fact.value.source_path : null;
      const target = typeof fact.value.target_path === "string" ? fact.value.target_path : null;
      if (source !== null && target !== null && result.has(target) && !result.has(source)) { result.add(source); changed = true; }
    }
  }
  return result;
}

function mergeIncrementalBundle(snapshot: Snapshot, baseline: FactBundle, delta: readonly ExtractionResult[], inventory: Inventory, invalidatedPaths: ReadonlySet<string>): FactBundle {
  const evidenceMap = new Map<string, Evidence>();
  const evidenceIds = new Map<string, string>();
  for (const item of baseline.evidence) {
    if (invalidatedPaths.has(item.relative_path)) continue;
    const id = stableId("evidence", snapshot.id, item.relative_path, item.locator.start, item.locator.end, item.rule_id);
    const rebased: Evidence = { ...item, id, snapshot_id: snapshot.id };
    evidenceMap.set(id, rebased);
    evidenceIds.set(item.id, id);
  }
  const facts: Fact[] = [];
  for (const fact of baseline.facts) {
    const mapped = fact.evidence_ids.map((id) => evidenceIds.get(id)).filter((id): id is string => id !== undefined);
    if (mapped.length !== fact.evidence_ids.length || mapped.length === 0) continue;
    facts.push({ ...fact, id: stableId("fact", fact.component_id, fact.kind, fact.value, ...mapped), evidence_ids: mapped });
  }
  const diagnostics: Diagnostic[] = baseline.diagnostics
    .filter((item) => !invalidatedPaths.has(item.scope))
    .map((item) => ({ ...item, id: stableId("diagnostic", snapshot.id, item.scope, item.code, item.message) }));
  const merged: ExtractionResult = {
    plugin_id: "incremental-merge",
    plugin_version: "1.0.0",
    facts: resolveSourceSemanticFacts([...facts, ...delta.flatMap((item) => item.facts)]),
    evidence: [...evidenceMap.values(), ...delta.flatMap((item) => item.evidence)],
    diagnostics: [...diagnostics, ...delta.flatMap((item) => item.diagnostics)],
    coverage_by_capability: baseline.coverage.capabilities,
    dependencies: inventory.files.map((file) => file.relative_path),
  };
  return buildBundle(snapshot, [merged], inventory.coverage);
}
