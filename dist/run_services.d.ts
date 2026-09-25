import type { Evidence, Fact, GraphEdge, GraphNode, Inventory, KnowledgeGraph, PublicationManifest, Snapshot } from "./contracts/types.js";
import type { EffectiveConfiguration } from "./config.js";
import type { ContractValidator } from "./contracts/validator.js";
import { type FactDiff } from "./compare.js";
import { type ProposalModel, type ProposalType } from "./proposal/model.js";
import { type QueryCategory } from "./query.js";
import type { AnalysisIntent, Capability } from "./intelligence/types.js";
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
export interface DocumentableFlow {
    component: string;
    method: string;
    path: string;
    handler: string;
    source_path: string;
    score: number;
}
export declare function findDocumentableFlows(component: string, query: string, facts: readonly Fact[], limit?: number): DocumentableFlow[];
export declare function prepareFlowDocumentation(config: EffectiveConfiguration, runId: string, component: string, method: string, path: string): Promise<{
    schema_version: number;
    status: string;
    scope: string;
    run_id: string;
    component: string;
    method: string;
    path: string;
    handler: string;
    source_path: string;
    markdown_path: string;
    repository_reads: number;
    ai_invocations: number;
}>;
export declare function searchRunDocumentation(packageRoot: string, config: EffectiveConfiguration, runId: string, query: string, repository?: string, limit?: number): Promise<{
    schema_version: number;
    query: string;
    total: number;
    results: {
        score: number;
        chunk: import("./intelligence/types.js").DocumentationChunk;
    }[];
}>;
export declare function expandRunDocumentContext(packageRoot: string, config: EffectiveConfiguration, runId: string, chunkIds: readonly string[], depth?: number, limit?: number): Promise<{
    schema_version: number;
    seed_chunk_ids: readonly string[];
    depth: number;
    chunks: import("./intelligence/types.js").DocumentationChunk[];
    chunk_distances: {
        [k: string]: number;
    };
    relations: import("./intelligence/types.js").DocumentationLink[];
}>;
export declare function prepareRunAnalysisContext(packageRoot: string, config: EffectiveConfiguration, runId: string, query: string, intent: AnalysisIntent, repository?: string): Promise<import("./intelligence/types.js").CompiledContext>;
export declare function locateRunCapability(packageRoot: string, config: EffectiveConfiguration, runId: string, query: string): Promise<{
    schema_version: number;
    query: string;
    matches: {
        capability: Capability;
        score: number;
    }[];
    total: number;
}>;
export declare function traceRunBusinessFlow(packageRoot: string, config: EffectiveConfiguration, runId: string, query: string): Promise<{
    schema_version: number;
    run_id: string;
    query: string;
    context_id: string;
    entrypoints: {
        repository: string;
        endpoint: {
            method: string;
            path: string;
        } | null;
        document: string;
    }[];
    steps: {
        repository: string;
        heading: string | null;
        symbols: string[];
        source_paths: string[];
        confidence: import("./intelligence/types.js").ConfidenceState[];
    }[];
    relations: import("./intelligence/types.js").DocumentationLink[];
    limitations: string[];
}>;
export declare function explainRunResponsibilities(packageRoot: string, config: EffectiveConfiguration, runId: string, query: string): Promise<{
    schema_version: number;
    query: string;
    status: string;
    responsibilities: never[];
    limitations: string[];
    capability_id?: never;
    repositories?: never;
    legacy_dependencies?: never;
    evidence_ids?: never;
} | {
    schema_version: number;
    query: string;
    status: string;
    capability_id: string;
    repositories: string[];
    responsibilities: {
        repository_id: string;
        role: string;
        basis: "extracted" | "explicit";
        evidence_ids: string[];
    }[];
    legacy_dependencies: {
        from: string;
        to: string;
        status: import("./intelligence/types.js").ConfidenceState;
    }[];
    evidence_ids: string[];
    limitations: string[];
}>;
export declare function analyzeRunChange(packageRoot: string, config: EffectiveConfiguration, runId: string, request: string, contextId?: string): Promise<{
    schema_version: number;
    analysis_id: string;
    run_id: string;
    request: string;
    context_id: string;
    complexity: string;
    criticality: string;
    confidence: string;
    affected_repositories: string[];
    consumers: string[];
    data_resources: string[];
    dimensions: {
        repositories: number;
        consumers: number;
        synchronous_dependencies: number;
        messages: number;
        data_resources: number;
        unresolved_relations: number;
        coordinated_deployments: number;
    };
    factors: string[];
    risks: string[];
    missing_information: string[];
    evidence_ids: string[];
    no_time_or_cost_estimate: boolean;
}>;
export declare function assessRunMigration(packageRoot: string, config: EffectiveConfiguration, runId: string, request: string, options?: {
    contextId?: string;
    from?: string;
    to?: string;
}): Promise<{
    schema_version: number;
    migration_id: string;
    run_id: string;
    context_id: string;
    capability_id: string | null;
    from: string | null;
    to: string | null;
    status: string;
    current_state: {
        repository: string;
        document: string;
        heading: string | null;
    }[];
    remaining_legacy_dependencies: GraphEdge[];
    impact: {
        schema_version: number;
        analysis_id: string;
        run_id: string;
        request: string;
        context_id: string;
        complexity: string;
        criticality: string;
        confidence: string;
        affected_repositories: string[];
        consumers: string[];
        data_resources: string[];
        dimensions: {
            repositories: number;
            consumers: number;
            synchronous_dependencies: number;
            messages: number;
            data_resources: number;
            unresolved_relations: number;
            coordinated_deployments: number;
        };
        factors: string[];
        risks: string[];
        missing_information: string[];
        evidence_ids: string[];
        no_time_or_cost_estimate: boolean;
    };
    phases: string[];
    rollback: string[];
    pending_decisions: string[];
    evidence_ids: string[];
}>;
export declare function investigateRunFlow(packageRoot: string, config: EffectiveConfiguration, runId: string, query: string, level?: number): Promise<{
    schema_version: number;
    run_id: string;
    query: string;
    context: import("./intelligence/types.js").CompiledContext;
    escalation: {
        level: number;
        status: string;
        next_action: string;
        authorization_required: boolean;
        limits?: never;
        tools?: never;
        missing_information?: never;
    } | {
        level: number;
        status: string;
        next_action: string;
        authorization_required: boolean;
        limits: {
            max_dependency_depth: number;
            max_files: number;
            max_bytes: number;
        };
        tools?: never;
        missing_information?: never;
    } | {
        level: number;
        status: string;
        next_action: string;
        authorization_required: boolean;
        limits: {
            max_dependency_depth?: never;
            max_files: number;
            max_bytes: number;
        };
        tools?: never;
        missing_information?: never;
    } | {
        limits?: never;
        level: number;
        status: string;
        next_action: string;
        authorization_required: boolean;
        tools: never[];
        missing_information?: never;
    } | {
        limits?: never;
        tools?: never;
        level: number;
        status: string;
        next_action: string;
        authorization_required: boolean;
        missing_information: string[];
    };
    directed_analysis: {
        mode: string;
        source_paths: string[];
        fact_ids: string[];
        evidence_ids: string[];
        max_dependency_depth: number;
    };
    authorized_evidence: {
        evidence_id: string;
        repository_id: string;
        source_path: string;
        locator: import("./contracts/types.js").EvidenceLocator;
    }[];
    restricted_agent_handoff: {
        question: string;
        context_id: string;
        missing_information: string[];
        authorized_evidence: {
            evidence_id: string;
            repository_id: string;
            source_path: string;
            locator: import("./contracts/types.js").EvidenceLocator;
        }[];
        budget: {
            max_dependency_depth: number;
            max_files: number;
            max_bytes: number;
        };
        tools: never[];
        repository_wide_scan: boolean;
    } | null;
    repository_wide_scan: boolean;
    repository_reads: number;
    bytes_read: number;
}>;
export declare function readRunSourceEvidence(config: EffectiveConfiguration, runId: string, evidenceId: string, maxBytes?: number): Promise<{
    read_at: string;
    run_id: string;
    evidence_id: string;
    repository_id: string;
    source_path: string;
    start_line: number;
    end_line: number;
    bytes: number;
    reason: string;
    conclusion: string;
    secrets_redacted: boolean;
    schema_version: number;
    content: string;
    repository_wide_scan: boolean;
}>;
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
    documentation_intelligence: {
        chunks: number;
        reused_chunks: number;
        capabilities: number;
        root: string;
    };
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
    documentation_intelligence: {
        chunks: number;
        reused_chunks: number;
        capabilities: number;
        root: string;
    };
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
export declare function prepareProposal(config: EffectiveConfiguration, runId: string, type: ProposalType, request: string, humanRequirements?: string[], options?: {
    packageRoot?: string;
    contextId?: string;
    capabilityId?: string;
    analysisId?: string;
    validator?: ContractValidator;
}): Promise<{
    proposal_id: string;
    status: "review_required";
    json_path: string;
    markdown_path: string;
    proposal: ProposalModel;
    context_id: string;
}>;
export declare function proposalIdentifier(runId: string, type: ProposalType, request: string, humanRequirements: readonly string[], context?: Record<string, unknown>): string;
export declare function validatedRunRoot(stateRoot: string, runId: string): string;
export {};
