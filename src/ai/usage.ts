import type { UsageRecord } from "../contracts/types.js";
export function usageFromProvider(runId: string, raw: Record<string, unknown> | null): UsageRecord {
  return { ai_invocations: 1, provider_turns: numberOrNull(raw?.turns), input_tokens: numberOrNull(raw?.input_tokens), output_tokens: numberOrNull(raw?.output_tokens), provider_amount: numberOrNull(raw?.amount), unit: typeof raw?.unit === "string" ? raw.unit : null, source: raw === null ? "provider-unavailable" : "provider-event", observation_scope: runId, observed_at: new Date().toISOString() };
}
function numberOrNull(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
