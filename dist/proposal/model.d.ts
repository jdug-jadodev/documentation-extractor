import type { Evidence, Finding, KnowledgeGraph } from "../contracts/types.js";
export type ProposalType = "specification" | "migration" | "adr";
export interface ProposalModel {
    schema_version: 3;
    proposal_type: ProposalType;
    status: "review_required";
    objective: string;
    scope: string[];
    exclusions: string[];
    current_state: string[];
    current_flow: string[];
    target_flow: string[];
    proposed_changes: string[];
    affected_components: string[];
    changes_by_repository: Array<{
        repository_id: string;
        changes: string[];
        document_paths: string[];
    }>;
    responsibilities: Array<{
        repository_id: string;
        role: string;
        basis: "extracted" | "explicit" | "inferred";
    }>;
    requirements: string[];
    contracts: string[];
    data_and_ownership: string[];
    reactive_behavior: string[];
    phases: string[];
    deployment_order: string[];
    acceptance_criteria: string[];
    validation: string[];
    tests: string[];
    risks: string[];
    rollback: string[];
    alternatives: string[];
    pending_decisions: string[];
    documentary_evidence: Array<{
        chunk_id: string;
        document_path: string;
        evidence_ids: string[];
    }>;
    evidence_ids: string[];
    confidence: "high" | "medium" | "low";
    facts: string[];
    inferences: string[];
    decisions: string[];
}
export declare function createProposal(input: {
    type: ProposalType;
    findings: Finding[];
    graph: KnowledgeGraph;
    evidence: Evidence[];
    requestedChanges: string[];
    humanRequirements?: string[];
}): ProposalModel;
