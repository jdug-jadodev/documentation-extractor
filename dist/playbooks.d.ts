import type { AgentRole } from "./contracts/types.js";
export type RequestType = "inventory" | "endpoints" | "describe-service" | "explain-connection" | "refresh-docs" | "specification" | "migration" | "adr";
export interface PlannedTask {
    id: string;
    role: AgentRole | "query" | "extract" | "graph" | "validate";
    operation: string;
    dependencies: string[];
}
export interface RequestPlan {
    schema_version: 3;
    request_type: RequestType;
    repository_ids: string[];
    snapshot_ids: string[];
    scope: "inventory" | "standard" | "full" | "targeted";
    operation: string;
    tasks: PlannedTask[];
    dependencies: Array<[string, string]>;
    required_confirmations: string[];
    unknowns: string[];
}
export declare function createRequestPlan(input: {
    type: RequestType;
    repository_ids: string[];
    snapshot_ids?: string[];
    scope?: "inventory" | "standard" | "full" | "targeted";
    highImpact?: boolean;
    strongModel?: boolean;
}): RequestPlan;
export declare function planMenuRequest(type: RequestType, repositoryIds: string[]): RequestPlan;
