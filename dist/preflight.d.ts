import type { EffectiveConfiguration } from "./config.js";
export interface PreflightIssue {
    code: string;
    severity: "blocked" | "warning";
    repository_id?: string;
    message: string;
    action: string;
}
export interface PreflightRepository {
    id: string;
    root: string;
    real_root: string;
    enabled: boolean;
    workspace_member: boolean;
    git_repository: boolean;
}
export interface PreflightReport {
    schema_version: 3;
    status: "configuration_pending" | "ready" | "blocked";
    workspace_membership_verified: boolean;
    git_executable: string | null;
    repositories: PreflightRepository[];
    issues: PreflightIssue[];
}
export declare function preflight(config: EffectiveConfiguration, requestedIds: readonly string[]): Promise<PreflightReport>;
export declare function findExecutable(names: readonly string[]): Promise<string | null>;
