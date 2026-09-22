import type { ContractValidator } from "./contracts/validator.js";
import type { FactBundle } from "./bundles.js";
import type { Inventory, KnowledgeGraph, Snapshot } from "./contracts/types.js";
export interface RepositoryExtraction {
    repository_id: string;
    snapshot: Snapshot;
    inventory: Inventory;
    bundle: FactBundle;
    update: {
        mode: "full" | "incremental" | "reused";
        changed_paths: string[];
        reprocessed_paths: string[];
        reused_files: number;
    };
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
export declare function runDeterministicScenario(input: {
    packageRoot: string;
    configPath: string;
    repositoryIds: readonly string[];
    refs?: Readonly<Record<string, string>>;
    workingTreePaths?: Readonly<Record<string, readonly string[]>>;
    validator: ContractValidator;
    signal?: AbortSignal;
    incremental?: IncrementalScenarioOptions;
}): Promise<DeterministicScenarioRun>;
export declare function runDeterministicExtraction(input: {
    packageRoot: string;
    configPath: string;
    repositoryId: string;
    ref?: string;
    validator: ContractValidator;
    signal?: AbortSignal;
}): Promise<DeterministicRun>;
