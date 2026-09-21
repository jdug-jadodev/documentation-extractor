import type { DocumentModel, KnowledgeGraph } from "../contracts/types.js";
import { branchKey } from "../platform/paths.js";

export function serviceDocumentPath(snapshot: DocumentModel["snapshots"][number]): string { return `Servicios/${snapshot.repository_id}/${branchKey(snapshot.requested_ref)}`; }
export function renderEditionIndex(model: DocumentModel): string {
  const lines = ["# Inicio de la edición", "", `Estado: **${model.status}**`, "", "## Servicios", ""];
  for (const snapshot of model.snapshots) lines.push(`- [[${serviceDocumentPath(snapshot)}/document|${snapshot.repository_id} · ${snapshot.requested_ref} · ${snapshot.commit_oid.slice(0, 12)}]]`);
  lines.push("", "## Avisos", "", "- La fecha de captura no demuestra que sea el último commit remoto.", "- Las relaciones muestran evidencia estática, no tráfico observado.", ""); return lines.join("\n");
}
export function renderGraphTable(graph: KnowledgeGraph): string { return ["| Origen | Relación | Destino | Estado | Evidencias |", "|---|---|---|---|---|", ...graph.edges.map((edge) => `| ${cell(edge.from)} | ${cell(edge.type)} | ${cell(edge.to)} | ${edge.status} | ${edge.evidence_ids.map(cell).join(", ")} |`)].join("\n"); }
function cell(value: string): string { return value.replaceAll("|", "\\|").replace(/[\r\n]/gu, " "); }
