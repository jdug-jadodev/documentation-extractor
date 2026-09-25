import type { Fact, KnowledgeGraph } from "../contracts/types.js";
import type { Capability, CompiledContext } from "./types.js";
export declare function locateCapability(runRoot: string, query: string): Promise<{
    schema_version: number;
    query: string;
    matches: {
        capability: Capability;
        score: number;
    }[];
    total: number;
}>;
export declare function traceBusinessFlow(runRoot: string, query: string): Promise<{
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
        confidence: import("./types.js").ConfidenceState[];
    }[];
    relations: import("./types.js").DocumentationLink[];
    limitations: string[];
}>;
export declare function explainResponsibilities(runRoot: string, query: string): Promise<{
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
        status: import("./types.js").ConfidenceState;
    }[];
    evidence_ids: string[];
    limitations: string[];
}>;
export declare function analyzeChange(input: {
    runId: string;
    runRoot: string;
    request: string;
    facts: readonly Fact[];
    graph: KnowledgeGraph;
    contextId?: string;
}): Promise<{
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
export declare function assessMigration(input: {
    runId: string;
    runRoot: string;
    request: string;
    facts: readonly Fact[];
    graph: KnowledgeGraph;
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
    remaining_legacy_dependencies: import("../contracts/types.js").GraphEdge[];
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
export declare function investigationDecision(context: CompiledContext, requestedLevel?: number): {
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
