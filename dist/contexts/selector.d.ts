import type { Coverage, Evidence, Fact, Finding, KnowledgeGraph, Snapshot, TaskPacket, AgentRole } from "../contracts/types.js";
export interface ContextSelection {
    run_id: string;
    task_id: string;
    role: AgentRole;
    operation: string;
    request: string;
    snapshot_ids: string[];
    fact_ids: string[];
    edge_ids: string[];
    template_sections: string[];
    required_output_schema: string;
}
export declare function selectContext(selection: ContextSelection, source: {
    snapshots: Snapshot[];
    facts: Fact[];
    evidence: Evidence[];
    graph: KnowledgeGraph;
    findings?: Finding[];
    coverage: Record<string, Coverage>;
    conventions?: Array<{
        statement: string;
        source: string;
        author: string | null;
    }>;
    unknowns?: string[];
}): TaskPacket;
