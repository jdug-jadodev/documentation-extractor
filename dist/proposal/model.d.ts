import type { Evidence, Finding, KnowledgeGraph } from "../contracts/types.js";
export type ProposalType = "specification" | "migration" | "adr";
export interface ProposalModel {
    schema_version: 3;
    proposal_type: ProposalType;
    status: "review_required";
    current_state: string[];
    proposed_changes: string[];
    affected_components: string[];
    requirements: string[];
    contracts: string[];
    phases: string[];
    acceptance_criteria: string[];
    tests: string[];
    risks: string[];
    rollback: string[];
    alternatives: string[];
    pending_decisions: string[];
    evidence_ids: string[];
}
export declare function createProposal(input: {
    type: ProposalType;
    findings: Finding[];
    graph: KnowledgeGraph;
    evidence: Evidence[];
    requestedChanges: string[];
    humanRequirements?: string[];
}): ProposalModel;
