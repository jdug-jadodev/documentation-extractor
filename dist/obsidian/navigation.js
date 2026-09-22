import { branchKey } from "../platform/paths.js";
export function serviceDocumentPath(snapshot) { return `Servicios/${snapshot.repository_id}/${branchKey(snapshot.requested_ref)}`; }
export function renderEditionIndex(model) {
    const lines = ["# Inicio de la edición", "", `Estado: **${model.status}**`, "", "## Servicios", ""];
    for (const snapshot of model.snapshots)
        lines.push(`- [[${serviceDocumentPath(snapshot)}/document|${snapshot.repository_id} · ${snapshot.requested_ref} · ${snapshot.commit_oid.slice(0, 12)}]]`);
    lines.push("", "## Avisos", "", "- La fecha de captura no demuestra que sea el último commit remoto.", "- Las relaciones muestran evidencia estática, no tráfico observado.", "");
    return lines.join("\n");
}
export function renderGraphTable(graph) {
    const label = (id) => { const node = graph.nodes.find((item) => item.id === id); return node ? `${node.label} (${node.type})` : id; };
    return ["| Origen | Relación | Destino | Estado | Evidencias |", "|---|---|---|---|---|", ...graph.edges.map((edge) => `| ${cell(label(edge.from))} | ${cell(edge.type)} | ${cell(label(edge.to))} | ${edge.status} | ${edge.evidence_ids.map(cell).join(", ")} |`)].join("\n");
}
function cell(value) { return value.replaceAll("|", "\\|").replace(/[\r\n]/gu, " "); }
//# sourceMappingURL=navigation.js.map