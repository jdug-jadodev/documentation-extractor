import type { Coverage, Evidence, Fact, Finding, KnowledgeGraph, Snapshot, TaskPacket, AgentRole } from "../contracts/types.js";

export interface ContextSelection {
  run_id: string; task_id: string; role: AgentRole; operation: string; request: string;
  snapshot_ids: string[]; fact_ids: string[]; edge_ids: string[]; template_sections: string[]; required_output_schema: string;
}

export function selectContext(selection: ContextSelection, source: { snapshots: Snapshot[]; facts: Fact[]; evidence: Evidence[]; graph: KnowledgeGraph; findings?: Finding[]; coverage: Record<string, Coverage>; conventions?: Array<{ statement: string; source: string; author: string | null }>; unknowns?: string[] }): TaskPacket {
  const snapshots = source.snapshots.filter((item) => selection.snapshot_ids.includes(item.id));
  const facts = source.facts.filter((item) => selection.fact_ids.includes(item.id));
  const evidenceIds = new Set(facts.flatMap((item) => item.evidence_ids));
  const edges = source.graph.edges.filter((item) => selection.edge_ids.includes(item.id));
  for (const id of edges.flatMap((item) => item.evidence_ids)) evidenceIds.add(id);
  const evidence = source.evidence.filter((item) => evidenceIds.has(item.id));
  const missing = [
    ...selection.snapshot_ids.filter((id) => !snapshots.some((item) => item.id === id)).map((id) => `snapshot:${id}`),
    ...selection.fact_ids.filter((id) => !facts.some((item) => item.id === id)).map((id) => `fact:${id}`),
    ...selection.edge_ids.filter((id) => !edges.some((item) => item.id === id)).map((id) => `edge:${id}`),
  ];
  if (missing.length > 0) throw new Error(`Contexto esencial ausente: ${missing.join(", ")}`);
  const nodeIds = new Set(edges.flatMap((item) => [item.from, item.to]));
  return { schema_version: 3, run_id: selection.run_id, task_id: selection.task_id, role: selection.role, operation: selection.operation, request: selection.request, snapshots, facts, evidence, graph_slice: { schema_version: 3, scenario_id: source.graph.scenario_id, snapshot_ids: source.graph.snapshot_ids, nodes: source.graph.nodes.filter((item) => nodeIds.has(item.id)), edges }, previous_findings: source.findings ?? [], conventions: source.conventions ?? [], template_sections: selection.template_sections, coverage: source.coverage, unknowns: source.unknowns ?? [], required_output_schema: selection.required_output_schema, limits: { allow_source_access: false, allow_publication: false, max_input_bytes: 49_152, max_output_bytes: 131_072 } };
}
