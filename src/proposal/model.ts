import type { Evidence, Finding, KnowledgeGraph } from "../contracts/types.js";

export type ProposalType = "specification" | "migration" | "adr";
export interface ProposalModel { schema_version: 3; proposal_type: ProposalType; status: "review_required"; current_state: string[]; proposed_changes: string[]; affected_components: string[]; requirements: string[]; contracts: string[]; phases: string[]; acceptance_criteria: string[]; tests: string[]; risks: string[]; rollback: string[]; alternatives: string[]; pending_decisions: string[]; evidence_ids: string[]; }

export function createProposal(input: { type: ProposalType; findings: Finding[]; graph: KnowledgeGraph; evidence: Evidence[]; requestedChanges: string[]; humanRequirements?: string[] }): ProposalModel {
  const evidenceIds = new Set(input.evidence.map((item) => item.id));
  const usedEvidence = input.findings.flatMap((finding) => finding.evidence_ids).filter((id) => evidenceIds.has(id));
  const affected = new Set<string>(); for (const edge of input.graph.edges) { affected.add(edge.from); affected.add(edge.to); }
  const base: ProposalModel = { schema_version: 3, proposal_type: input.type, status: "review_required", current_state: input.findings.map((finding) => finding.statement), proposed_changes: [...input.requestedChanges], affected_components: [...affected], requirements: [...(input.humanRequirements ?? [])], contracts: input.graph.edges.map((edge) => `${edge.type}: ${edge.from} -> ${edge.to} (${edge.status})`), phases: [], acceptance_criteria: [], tests: [], risks: input.graph.edges.flatMap((edge) => edge.limitations), rollback: [], alternatives: [], pending_decisions: [], evidence_ids: [...new Set(usedEvidence)] };
  if (input.type === "specification") { base.acceptance_criteria.push("Criterios verificables pendientes de validación humana para cada requisito."); base.tests.push("Casos positivos, negativos y límites derivados de los criterios aprobados."); }
  if (input.type === "migration") { base.phases.push("Preparación y compatibilidad", "Transición controlada", "Verificación", "Retiro posterior a aprobación"); base.rollback.push("Restaurar la versión anterior conservando datos y contratos compatibles."); }
  if (input.type === "adr") { base.alternatives.push("Mantener el estado actual", "Aplicar la decisión propuesta de forma reversible"); base.pending_decisions.push("Aprobación del equipo propietario y revisión de consecuencias."); }
  return base;
}
