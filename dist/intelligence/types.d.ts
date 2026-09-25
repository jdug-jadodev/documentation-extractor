export type ConfidenceState = "supported" | "candidate" | "unresolved";
export type AnalysisIntent = "development" | "migration" | "impact" | "responsibilities";
export interface DocumentationChunk {
    id: string;
    run_id: string;
    repository_id: string;
    ref: string;
    commit: string;
    document_path: string;
    document_type: string;
    section_type: string;
    heading: string | null;
    endpoint: {
        method: string;
        path: string;
    } | null;
    symbols: string[];
    source_paths: string[];
    layers: string[];
    roles: string[];
    evidence_ids: string[];
    confidence_states: ConfidenceState[];
    outgoing_links: string[];
    content: string;
    sha256: string;
}
export interface DocumentationLink {
    from: string;
    to: string;
    type: "documents" | "belongs_to" | "contains_symbol" | "calls" | "reactive_stage" | "called_by" | "implements" | "implemented_by" | "injects" | "maps_to" | "persists_with" | "reads_from" | "writes_to" | "exposes" | "consumes" | "publishes" | "subscribes" | "migrated_from" | "still_depends_on" | "used_by_front";
    status: ConfidenceState;
    fact_ids: string[];
    evidence_ids: string[];
}
export interface DocumentationIntelligenceManifest {
    schema_version: 3;
    index_version: number;
    run_id: string;
    generated_at: string;
    documents: Array<{
        path: string;
        sha256: string;
        chunks: string[];
    }>;
    chunks: number;
    reused_chunks: number;
    metrics: {
        duration_ms: number;
        heap_delta_bytes: number;
        link_count: number;
    };
    repositories: Array<{
        id: string;
        ref: string;
        commit: string;
    }>;
}
export interface Capability {
    id: string;
    name: string;
    aliases: string[];
    repositories: string[];
    entrypoints: string[];
    flows: string[];
    responsibilities: Array<{
        repository_id: string;
        role: string;
        basis: "extracted" | "explicit";
        evidence_ids: string[];
    }>;
    legacy_dependencies: Array<{
        from: string;
        to: string;
        status: ConfidenceState;
    }>;
    contracts: string[];
    data_resources: string[];
    document_chunk_ids: string[];
    evidence_ids: string[];
    confidence: "high" | "medium" | "low";
}
export interface ContextBudget {
    max_context_tokens: number;
    max_documents: number;
    max_flows: number;
    max_symbols: number;
    max_documents_per_repository: number;
}
export interface CompiledContext {
    schema_version: 3;
    context_id: string;
    run_id: string;
    intent: AnalysisIntent;
    query: string;
    chunks: DocumentationChunk[];
    statistics: {
        documents_considered: number;
        documents_selected: number;
        repositories_represented: string[];
        estimated_tokens: number;
        omitted_by_budget: number;
        unresolved_relations: number;
    };
    missing_information: string[];
    sufficient: boolean;
}
