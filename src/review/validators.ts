import type { DocumentModel, Evidence, Fact, KnowledgeGraph } from "../contracts/types.js";
import { ASD_SECTIONS } from "../documentation/model.js";
import { assertNoKnownSecret } from "../security/redaction.js";

export interface ReviewIssue { id: string; severity: "info" | "warning" | "error" | "security"; document_section: string; claim: string; evidence_ids: string[]; reason: string; required_action: string; }

export function validateDocument(model: DocumentModel, input: { facts: readonly Fact[]; evidence: readonly Evidence[]; graph: KnowledgeGraph; rendered: string }): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const factIds = new Set(input.facts.map((fact) => fact.id)), evidenceIds = new Set(input.evidence.map((item) => item.id)), edgeIds = new Set(input.graph.edges.map((edge) => edge.id));
  for (const required of ASD_SECTIONS.filter((section) => section.required)) if (!model.sections.some((section) => section.id === required.id)) issues.push(issue("error", required.id, "Sección obligatoria ausente", [], "ASD-TSE-100 exige conservarla.", "Regenerar desde DocumentModel."));
  for (const section of model.sections) for (const claim of section.claims) {
    for (const id of claim.fact_ids) if (!factIds.has(id)) issues.push(issue("error", section.id, claim.text, claim.evidence_refs, `Hecho inexistente: ${id}`, "Retirar o corregir la referencia."));
    for (const id of claim.evidence_refs) if (!evidenceIds.has(id)) issues.push(issue("error", section.id, claim.text, claim.evidence_refs, `Evidencia inexistente: ${id}`, "Retirar o corregir la referencia."));
  }
  for (const edge of input.graph.edges) if (!edgeIds.has(edge.id) || edge.evidence_ids.some((id) => !evidenceIds.has(id))) issues.push(issue("error", "arquitectura", edge.id, edge.evidence_ids, "Relación con referencia inválida.", "Reconstruir el grafo."));
  try { assertNoKnownSecret(input.rendered); } catch (error) { issues.push(issue("security", "documento", "Salida exportable", [], error instanceof Error ? error.message : String(error), "Bloquear publicación y sanear antes de serializar.")); }
  if (/\]\((?:file:|javascript:|https?:\/\/)/iu.test(input.rendered)) issues.push(issue("security", "documento", "Enlace externo o ejecutable", [], "La boveda generada solo admite enlaces relativos controlados.", "Eliminar el enlace o convertirlo en texto."));
  return issues;
}

function issue(severity: ReviewIssue["severity"], section: string, claim: string, evidence: string[], reason: string, action: string): ReviewIssue { return { id: `review-${severity}-${section}-${Math.abs(hash(reason))}`, severity, document_section: section, claim, evidence_ids: evidence, reason, required_action: action }; }
function hash(value: string): number { let result = 0; for (const character of value) result = ((result << 5) - result + character.codePointAt(0)!) | 0; return result; }
