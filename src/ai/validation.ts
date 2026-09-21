import type { AgentResult, Evidence, Fact } from "../contracts/types.js";
import type { ContractValidator } from "../contracts/validator.js";

export function parseAndValidateAgentResult(text: string, validator: ContractValidator, expected: { task_id: string; role: AgentResult["role"]; facts: readonly Fact[]; evidence: readonly Evidence[] }): AgentResult {
  let value: unknown;
  try { value = JSON.parse(stripCodeFence(text)); } catch { throw new Error("La respuesta del agente no es JSON válido."); }
  validator.assert<AgentResult>("agent-result", value);
  if (value.task_id !== expected.task_id || value.role !== expected.role) throw new Error("La respuesta no corresponde a la tarea o rol solicitados.");
  validator.assertAgentResultReferences(value, new Set(expected.facts.map((item) => item.id)), new Set(expected.evidence.map((item) => item.id)));
  assertCanonicalValuesUntouched(value.payload, expected.facts);
  return value;
}

function stripCodeFence(value: string): string { const trimmed = value.trim(); const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/iu.exec(trimmed); return match?.[1] ?? trimmed; }
function assertCanonicalValuesUntouched(payload: unknown, facts: readonly Fact[]): void {
  const byId = new Map(facts.map((fact) => [fact.id, fact.value]));
  visit(payload, (record) => {
    if (typeof record.fact_id === "string" && "fact_value" in record && byId.has(record.fact_id) && JSON.stringify(record.fact_value) !== JSON.stringify(byId.get(record.fact_id))) throw new Error(`El agente intentó cambiar el valor del hecho ${record.fact_id}.`);
    if (record.approved === true || record.published === true) throw new Error("Un agente no puede conceder aprobación o publicación.");
  });
}
function visit(value: unknown, callback: (record: Record<string, unknown>) => void): void { if (Array.isArray(value)) { value.forEach((item) => visit(item, callback)); return; } if (!value || typeof value !== "object") return; const record = value as Record<string, unknown>; callback(record); Object.values(record).forEach((item) => visit(item, callback)); }
