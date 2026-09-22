import type { ContractValidator } from "./contracts/validator.js";
export interface RepositorySyncResult {
    repository_id: string;
    branch: string;
    remote: string | null;
    commit_before: string;
    commit_after: string;
    fetched: boolean;
    pulled: boolean;
}
export interface RefreshKnowledgeResult {
    schema_version: 3;
    status: "unchanged" | "updated";
    run_id: string;
    baseline_run_id: string | null;
    repositories: Array<RepositorySyncResult & {
        changed_paths: string[];
        update_mode: "full" | "incremental" | "reused";
        reprocessed_paths: string[];
        reused_files: number;
    }>;
    relations: number;
    ai_invocations: 0;
    published: boolean;
    publication?: unknown;
}
export declare function refreshKnowledge(input: {
    packageRoot: string;
    configPath: string;
    validator: ContractValidator;
    repositoryIds?: readonly string[];
    refs?: Readonly<Record<string, string>>;
    syncRemote?: boolean;
    publish?: boolean;
    signal?: AbortSignal;
}): Promise<RefreshKnowledgeResult>;
