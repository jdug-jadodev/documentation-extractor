import type { Fact } from "./contracts/types.js";

export type QueryCategory = "endpoints" | "dependencies" | "messages" | "data" | "coverage" | "evidence";
const KINDS: Record<Exclude<QueryCategory, "coverage" | "evidence">, string[]> = {
  endpoints: ["http_endpoint", "http_endpoint_fragment"], dependencies: ["package_dependency", "http_client_base", "http_client_call"], messages: ["message_producer", "message_consumer", "message_resource"], data: ["data_entity", "data_read", "data_write", "data_resource"]
};

export function queryFacts(facts: readonly Fact[], category: QueryCategory, options: { componentId?: string; offset?: number; limit?: number } = {}): { total: number; offset: number; limit: number; items: Fact[]; complete: boolean } {
  if (category === "coverage" || category === "evidence") throw new Error(`La categoría ${category} usa su índice tipado, no facts.`);
  const filtered = facts.filter((fact) => KINDS[category].includes(fact.kind) && (options.componentId === undefined || fact.component_id === options.componentId));
  const offset = options.offset ?? 0, limit = Math.min(options.limit ?? 100, 1000); const items = filtered.slice(offset, offset + limit);
  return { total: filtered.length, offset, limit, items, complete: offset + items.length >= filtered.length };
}

export function renderFactTable(result: ReturnType<typeof queryFacts>): string {
  const lines = ["| ID | Componente | Tipo | Valor | Evidencia |", "|---|---|---|---|---|"];
  for (const fact of result.items) lines.push(`| ${cell(fact.id)} | ${cell(fact.component_id)} | ${cell(fact.kind)} | ${cell(JSON.stringify(fact.value))} | ${fact.evidence_ids.map(cell).join(", ")} |`);
  if (!result.complete) lines.push("", `Mostrando ${result.offset + 1}-${result.offset + result.items.length} de ${result.total}; hay más resultados.`);
  return lines.join("\n");
}
function cell(value: string): string { return value.replaceAll("|", "\\|").replace(/[\r\n]/gu, " "); }
