import type { Evidence, Finding, KnowledgeGraph } from "../contracts/types.js";

export type ProposalType = "specification" | "migration" | "adr";
export interface ProposalModel { schema_version: 3; proposal_type: ProposalType; status: "review_required"; objective: string; scope: string[]; exclusions: string[]; current_state: string[]; current_flow: string[]; target_flow: string[]; proposed_changes: string[]; affected_components: string[]; changes_by_repository: Array<{ repository_id: string; changes: string[]; document_paths: string[] }>; responsibilities: Array<{ repository_id: string; role: string; basis: "extracted" | "explicit" | "inferred" }>; requirements: string[]; contracts: string[]; data_and_ownership: string[]; reactive_behavior: string[]; phases: string[]; deployment_order: string[]; acceptance_criteria: string[]; validation: string[]; tests: string[]; risks: string[]; rollback: string[]; alternatives: string[]; pending_decisions: string[]; documentary_evidence: Array<{ chunk_id: string; document_path: string; evidence_ids: string[] }>; evidence_ids: string[]; confidence: "high" | "medium" | "low"; facts: string[]; inferences: string[]; decisions: string[]; }

export function createProposal(input: { type: ProposalType; findings: Finding[]; graph: KnowledgeGraph; evidence: Evidence[]; requestedChanges: string[]; humanRequirements?: string[] }): ProposalModel {
  const evidenceIds = new Set(input.evidence.map((item) => item.id));
  const usedEvidence = input.findings.flatMap((finding) => finding.evidence_ids).filter((id) => evidenceIds.has(id));
  const affected = new Set<string>(); for (const edge of input.graph.edges) { affected.add(edge.from); affected.add(edge.to); }
  const base: ProposalModel = { schema_version: 3, proposal_type: input.type, status: "review_required", objective: input.requestedChanges.join(" "), scope: [], exclusions: ["No modifica repositorios ni aprueba decisiones arquitectónicas."], current_state: input.findings.map((finding) => finding.statement), current_flow: [], target_flow: [], proposed_changes: [...input.requestedChanges], affected_components: [...affected], changes_by_repository: [], responsibilities: [], requirements: [...(input.humanRequirements ?? [])], contracts: input.graph.edges.map((edge) => `${edge.type}: ${edge.from} -> ${edge.to} (${edge.status})`), data_and_ownership: [], reactive_behavior: [], phases: [], deployment_order: [], acceptance_criteria: [], validation: [], tests: [], risks: input.graph.edges.flatMap((edge) => edge.limitations), rollback: [], alternatives: [], pending_decisions: [], documentary_evidence: [], evidence_ids: [...new Set(usedEvidence)], confidence: usedEvidence.length > 0 ? "medium" : "low", facts: input.findings.filter((finding) => finding.classification === "fact").map((finding) => finding.statement), inferences: input.findings.filter((finding) => finding.classification === "inference").map((finding) => finding.statement), decisions: [...(input.humanRequirements ?? [])] };
  if (input.type === "specification") { base.acceptance_criteria.push("Criterios verificables pendientes de validación humana para cada requisito."); base.tests.push("Casos positivos, negativos y límites derivados de los criterios aprobados."); base.validation.push("Validar contratos, comportamiento funcional y regresión de consumidores observados."); }
  if (input.type === "migration") {
    const edgeTypes = new Set(input.graph.edges.map((edge) => edge.type));
    const uncertainEdges = input.graph.edges.filter((edge) => edge.status !== "supported");
    base.phases.push("Preparación y compatibilidad", "Transición controlada", "Verificación", "Retiro posterior a aprobación");
    base.acceptance_criteria.push(
      "Los contratos observados permanecen compatibles durante la transición o cada ruptura queda documentada y aprobada humanamente.",
      "Las relaciones candidatas o no resueltas que afecten el corte final quedan confirmadas, descartadas o aceptadas explícitamente como riesgo.",
      "El retiro de la implementación anterior solo ocurre después de verificar la transición y el rollback con evidencia revisable.",
    );
    if (edgeTypes.has("calls_http")) base.tests.push("Pruebas contractuales para cada relación HTTP observada que resulte afectada, sin asumir cuerpos ni códigos no extraídos.");
    if (edgeTypes.has("reads_data") || edgeTypes.has("writes_data")) base.tests.push("Pruebas de regresión sobre las lecturas y escrituras de datos observadas que cambien de responsabilidad.");
    if (edgeTypes.has("publishes_to") || edgeTypes.has("consumes_from")) base.tests.push("Pruebas de producción y consumo para cada recurso de mensajería observado que resulte afectado.");
    base.tests.push("Prueba controlada de transición y prueba de rollback antes de autorizar el retiro de la implementación anterior.");
    base.rollback.push("Restaurar la versión anterior conservando datos y contratos compatibles.");
    base.deployment_order.push("Desplegar compatibilidad", "Desplegar destino", "Migrar consumidores", "Retirar origen sólo después de aprobación");
    base.alternatives.push("Mantener el estado actual", "Realizar una transición gradual conservando temporalmente la implementación anterior");
    base.pending_decisions.push(
      "Confirmar el alcance exacto de responsabilidades y contratos que se trasladarán.",
      "Definir criterios medibles de entrada, salida y retiro para cada fase.",
      "Aprobar responsables, ventanas y mecanismos concretos únicamente cuando exista evidencia suficiente.",
      ...uncertainEdges.map((edge) => `Resolver ${edge.id} (${edge.status}): ${edge.from} ${edge.type} ${edge.to}.`),
    );
  }
  if (input.type === "adr") { base.alternatives.push("Mantener el estado actual", "Aplicar la decisión propuesta de forma reversible"); base.pending_decisions.push("Aprobación del equipo propietario y revisión de consecuencias."); base.validation.push("Revisar la decisión con propietarios técnicos y funcionales."); }
  base.tests = unique(base.tests);
  base.risks = unique(base.risks);
  base.pending_decisions = unique(base.pending_decisions);
  return base;
}

function unique(values: string[]): string[] { return [...new Set(values.filter((value) => value.trim() !== ""))]; }
