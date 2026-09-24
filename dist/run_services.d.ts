import type { Evidence, Fact, GraphEdge, GraphNode, Inventory, KnowledgeGraph, PublicationManifest, Snapshot } from "./contracts/types.js";
import type { EffectiveConfiguration } from "./config.js";
import { type FactDiff } from "./compare.js";
import { type ProposalModel, type ProposalType } from "./proposal/model.js";
import { type QueryCategory } from "./query.js";
export interface RunArtifacts {
    run_id: string;
    root: string;
    snapshots: Snapshot[];
    facts: Fact[];
    evidence: Evidence[];
    inventories: Inventory[];
    graph: KnowledgeGraph;
}
interface KnowledgeCatalogEntry {
    run_id: string;
    snapshot_id: string;
    commit_oid: string;
    requested_ref: string;
}
interface KnowledgeCatalog {
    schema_version: 3;
    repositories: Record<string, KnowledgeCatalogEntry>;
    updated_at: string;
}
export interface FlowPath {
    nodes: GraphNode[];
    edges: GraphEdge[];
}
export interface FlowTrace {
    schema_version: 3;
    run_id: string;
    from: string;
    to: string;
    status: "supported" | "candidate" | "unresolved";
    paths: FlowPath[];
    limitations: string[];
}
export declare function prepareRunDocumentation(packageRoot: string, config: EffectiveConfiguration, runId: string): Promise<{
    status: "review";
    run_id: string;
    candidate_vault: string;
    issues: number;
    blocking_issues: number;
    model_status: "final";
    repository_count: number;
    repository_sources: Record<string, KnowledgeCatalogEntry>;
    knowledge_catalog: KnowledgeCatalog;
    archify: {
        skill_status: "available" | "missing";
        mode: "archify" | "fallback";
        external_implementation: string | null;
    };
}>;
/** Loads the requested run together with the latest published knowledge for repositories not present in it. */
export declare function loadWorkspaceArtifacts(config: EffectiveConfiguration, runId: string): Promise<RunArtifacts>;
export declare function prepareAndPublishDocumentation(packageRoot: string, config: EffectiveConfiguration, runId: string): Promise<{
    run_id: string;
    candidate_vault: string;
    issues: number;
    blocking_issues: number;
    model_status: "final";
    repository_count: number;
    repository_sources: Record<string, KnowledgeCatalogEntry>;
    knowledge_catalog: KnowledgeCatalog;
    archify: {
        skill_status: "available" | "missing";
        mode: "archify" | "fallback";
        external_implementation: string | null;
    };
    status: "published";
    published: boolean;
    reused_edition: boolean;
    edition: PublicationManifest;
    obsidian_path: string;
}>;
export declare function loadRunArtifacts(config: EffectiveConfiguration, runId: string): Promise<RunArtifacts>;
export declare function queryRunArtifacts(artifacts: RunArtifacts, category: QueryCategory, options?: {
    repositoryId?: string;
    componentId?: string;
    offset?: number;
    limit?: number;
}): {
    total: number;
    offset: number;
    limit: number;
    items: Fact[];
    complete: boolean;
} | {
    total: number;
    offset: number;
    limit: number;
    items: Evidence[] | {
        repository_id: string;
        snapshot_id: string;
        coverage: import("./contracts/types.js").Coverage;
    }[];
    complete: boolean;
};
export declare function renderRunQueryTable(category: QueryCategory, result: ReturnType<typeof queryRunArtifacts>): string;
export declare function traceFlow(graph: KnowledgeGraph, runId: string, fromInput: string, toInput: string, maxDepth?: number): FlowTrace;
export declare function explainRelations(graph: KnowledgeGraph, runId: string, fromInput?: string, toInput?: string): FlowTrace | {
    schema_version: number;
    run_id: string;
    status: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    limitations: string[];
};
export declare function compareRuns(config: EffectiveConfiguration, baseRunId: string, targetRunId: string, repositoryId?: string): Promise<{
    schema_version: 3;
    base_run_id: string;
    target_run_id: string;
    repository_id: string | null;
    complete: boolean;
    diff: FactDiff;
}>;
export declare function prepareProposal(config: EffectiveConfiguration, runId: string, type: ProposalType, request: string, humanRequirements?: string[]): Promise<{
    proposal_id: string;
    status: "review_required";
    json_path: string;
    markdown_path: string;
    proposal: ProposalModel;
}>;
export declare function proposalIdentifier(runId: string, type: ProposalType, request: string, humanRequirements: readonly string[]): string;
export declare function validatedRunRoot(stateRoot: string, runId: string): string;
export {};
