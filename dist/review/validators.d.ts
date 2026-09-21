import type { DocumentModel, Evidence, Fact, KnowledgeGraph } from "../contracts/types.js";
export interface ReviewIssue {
    id: string;
    severity: "info" | "warning" | "error" | "security";
    document_section: string;
    claim: string;
    evidence_ids: string[];
    reason: string;
    required_action: string;
}
export declare function validateDocument(model: DocumentModel, input: {
    facts: readonly Fact[];
    evidence: readonly Evidence[];
    graph: KnowledgeGraph;
    rendered: string;
}): ReviewIssue[];
