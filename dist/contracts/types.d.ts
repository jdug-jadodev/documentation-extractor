export declare const SCHEMA_VERSION: 3;
export type TaskStatus = "pending" | "running" | "completed" | "blocked" | "failed" | "cancelled" | "cached";
export type RunStatus = "planned" | "running" | "awaiting_confirmation" | "awaiting_interpretation" | "review" | "review_required" | "approved" | "published" | "failed" | "cancelled";
export type BundleQuality = "complete" | "partial" | "unsupported" | "failed";
export type Freshness = "current_for_snapshot" | "stale" | "freshness_unknown";
export type Classification = "fact" | "inference" | "unknown";
export type CapabilityStatus = "implemented" | "partial" | "unsupported";
export interface RepositoryRef {
    id: string;
    local_root: string;
    enabled: boolean;
    default_branch: string | null;
}
export interface Snapshot {
    schema_version: 3;
    id: string;
    repository_id: string;
    requested_ref: string;
    resolved_ref: string;
    commit_oid: string;
    capture_mode: "git" | "working_tree";
    content_hash: string;
    dirty: boolean;
    captured_at: string;
}
export interface SnapshotEntry {
    relative_path: string;
    object_id: string;
    size: number;
    mode: string;
    kind: "blob" | "symlink" | "submodule";
}
export interface SnapshotReader {
    readonly snapshot: Snapshot;
    list(signal?: AbortSignal): Promise<readonly SnapshotEntry[]>;
    read(relativePath: string, options?: {
        maxBytes?: number;
        signal?: AbortSignal;
    }): Promise<Uint8Array>;
}
export interface CapabilityCoverage {
    capability: string;
    status: CapabilityStatus;
    processed: number;
    failed: number;
    limitations: string[];
}
export interface Coverage {
    discovered: number;
    excluded: number;
    eligible: number;
    processed: number;
    failed: number;
    unsupported: number;
    not_scanned: number;
    capabilities: CapabilityCoverage[];
    exclusion_reasons: Record<string, number>;
}
export interface EvidenceLocator {
    kind: "bytes" | "lines" | "structured";
    start?: number;
    end?: number;
    key?: string;
}
export interface Evidence {
    schema_version: 3;
    id: string;
    repository_id: string;
    snapshot_id: string;
    relative_path: string;
    source_hash: string;
    locator: EvidenceLocator;
    rule_id: string;
}
export type FactValue = string | number | boolean | null | Record<string, unknown> | unknown[];
export interface Fact {
    schema_version: 3;
    id: string;
    kind: string;
    component_id: string;
    value: FactValue;
    evidence_ids: string[];
    rule_id: string;
}
export interface Diagnostic {
    schema_version: 3;
    id: string;
    severity: "info" | "warning" | "error" | "security";
    code: string;
    scope: string;
    message: string;
    evidence_ids: string[];
    suggested_action: string;
}
export interface Finding {
    schema_version: 3;
    id: string;
    classification: Classification;
    statement: string;
    fact_ids: string[];
    evidence_ids: string[];
    limitations: string[];
}
export interface CandidateStack {
    plugin_id: string;
    component_id: string;
    languages: string[];
    evidence_paths: string[];
}
export interface ExtractionResult {
    plugin_id: string;
    plugin_version: string;
    facts: Fact[];
    evidence: Evidence[];
    diagnostics: Diagnostic[];
    coverage_by_capability: CapabilityCoverage[];
    dependencies: string[];
}
export interface InventoryFile {
    relative_path: string;
    size: number;
    source_hash: string;
    classification: "source" | "manifest" | "test" | "documentation" | "other";
    language: string | null;
    excluded_reason: string | null;
}
export interface Inventory {
    schema_version: 3;
    repository_id: string;
    snapshot_id: string;
    projects: Array<{
        id: string;
        root: string;
        manifest: string;
        technologies: string[];
    }>;
    files: InventoryFile[];
    candidate_stacks: CandidateStack[];
    coverage: Coverage;
    diagnostics: Diagnostic[];
}
export interface ExtractorPlugin {
    readonly id: string;
    readonly version: string;
    readonly supported_languages: readonly string[];
    readonly capabilities: Readonly<Record<string, CapabilityStatus>>;
    readonly rule_versions: Readonly<Record<string, string>>;
    detect(inventory: Inventory): Promise<CandidateStack[]>;
    extract(reader: SnapshotReader, component: CandidateStack, options: ExtractionOptions): Promise<ExtractionResult>;
}
export interface ExtractionOptions {
    signal?: AbortSignal;
    max_file_bytes: number;
    grammar_root: string;
}
export interface GraphNode {
    id: string;
    type: "repository" | "component" | "external_service" | "message_resource" | "data_resource" | "package";
    label: string;
    environment: string | null;
    fact_ids: string[];
}
export interface GraphEdge {
    id: string;
    from: string;
    to: string;
    type: "calls_http" | "publishes_to" | "consumes_from" | "reads_data" | "writes_data" | "depends_on_package";
    environment: string | null;
    scenario_id: string;
    status: "supported" | "candidate" | "unresolved";
    fact_ids: string[];
    evidence_ids: string[];
    rule_id: string;
    limitations: string[];
}
export interface KnowledgeGraph {
    schema_version: 3;
    scenario_id: string;
    snapshot_ids: string[];
    nodes: GraphNode[];
    edges: GraphEdge[];
}
export interface Scenario {
    schema_version: 3;
    id: string;
    snapshots: Array<{
        repository_id: string;
        snapshot_id: string;
    }>;
    environment: string | null;
    aliases: Record<string, string>;
}
export interface TaskPacket {
    schema_version: 3;
    run_id: string;
    task_id: string;
    role: AgentRole;
    operation: string;
    request: string;
    snapshots: Snapshot[];
    facts: Fact[];
    evidence: Evidence[];
    graph_slice: KnowledgeGraph;
    previous_findings: Finding[];
    conventions: Array<{
        statement: string;
        source: string;
        author: string | null;
    }>;
    template_sections: string[];
    coverage: Record<string, Coverage>;
    unknowns: string[];
    required_output_schema: string;
    limits: {
        allow_source_access: false;
        allow_publication: false;
        max_input_bytes: number;
        max_output_bytes: number;
    };
}
export type AgentRole = "orchestrator" | "inventory" | "extraction" | "integration" | "documentation" | "review" | "proposal" | "publication";
export interface AgentResult<T = Record<string, unknown>> {
    schema_version: 3;
    task_id: string;
    role: AgentRole;
    status: "ok" | "needs_evidence" | "review_required";
    payload: T;
    limitations: string[];
    evidence_requests: Array<{
        category: string;
        question: string;
    }>;
}
export interface UsageRecord {
    ai_invocations: number;
    provider_turns: number | null;
    input_tokens: number | null;
    output_tokens: number | null;
    provider_amount: number | null;
    unit: string | null;
    source: string;
    observation_scope: string;
    observed_at: string;
}
export interface AIRequest {
    profile: string;
    model: string;
    packet: TaskPacket;
    timeout_ms: number;
    signal?: AbortSignal;
}
export interface AIResultEnvelope {
    result: AgentResult;
    usage: UsageRecord;
    model_requested: string;
    model_observed: string | null;
    sanitized_stderr: string;
    exit_code: number;
}
export interface AIExecutor {
    execute(request: AIRequest): Promise<AIResultEnvelope>;
}
export interface DocumentClaim {
    id: string;
    text: string;
    classification: Classification;
    fact_ids: string[];
    finding_ids: string[];
    evidence_refs: string[];
}
export interface DocumentSection {
    id: string;
    title: string;
    required: boolean;
    paragraphs: string[];
    claims: DocumentClaim[];
    tables: Array<{
        headers: string[];
        rows: string[][];
    }>;
    limitations: string[];
    interpretation_status: "factual" | "interpreted" | "pending";
}
export interface DocumentModel {
    schema_version: 3;
    document_id: string;
    run_id: string;
    title: string;
    repositories: string[];
    snapshots: Snapshot[];
    status: "final";
    format: "ASD-TSE-100";
    language: "es-CO";
    archify: {
        status: "executed" | "unavailable";
        mode: "archify" | "fallback";
        version: string | null;
    };
    sections: DocumentSection[];
}
export interface ApprovalReceipt {
    schema_version: 3;
    run_id: string;
    actor: string;
    approved_at: string;
    scope: string[];
    content_digest: string;
    file_hashes: Record<string, string>;
    exceptions: string[];
}
export interface PublicationManifest {
    schema_version: 3;
    edition_id: string;
    run_id: string;
    created_at: string;
    previous_edition_id: string | null;
    files: Array<{
        path: string;
        sha256: string;
        size: number;
    }>;
    complete: boolean;
}
export interface PublicationTarget {
    publish(candidateRoot: string, receipt: ApprovalReceipt, options: {
        signal?: AbortSignal;
    }): Promise<PublicationManifest>;
}
