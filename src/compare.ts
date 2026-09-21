import type { Fact } from "./contracts/types.js";
import { contentHash } from "./platform/hash.js";

export interface FactDiff { added: Fact[]; removed: Fact[]; modified: Array<{ before: Fact; after: Fact }>; unknown_changes: string[]; }
export function compareFacts(base: readonly Fact[], target: readonly Fact[], inputComplete = true): FactDiff {
  const semantic = (fact: Fact) => `${fact.kind}:${fact.component_id}:${contentHash(fact.value)}`;
  const logical = (fact: Fact) => `${fact.kind}:${fact.component_id}:${logicalKey(fact.value)}`;
  const baseSemantic = new Map(base.map((fact) => [semantic(fact), fact])), targetSemantic = new Map(target.map((fact) => [semantic(fact), fact]));
  const added = target.filter((fact) => !baseSemantic.has(semantic(fact))), removed = inputComplete ? base.filter((fact) => !targetSemantic.has(semantic(fact))) : [];
  const byLogical = new Map(base.map((fact) => [logical(fact), fact])); const modified: Array<{ before: Fact; after: Fact }> = [];
  for (const fact of [...added]) { const prior = byLogical.get(logical(fact)); if (prior) modified.push({ before: prior, after: fact }); }
  const modifiedIds = new Set(modified.flatMap((item) => [item.before.id, item.after.id]));
  return { added: added.filter((item) => !modifiedIds.has(item.id)), removed: removed.filter((item) => !modifiedIds.has(item.id)), modified, unknown_changes: inputComplete ? [] : ["La captura objetivo es parcial; las ausencias no se clasifican como bajas."] };
}
function logicalKey(value: unknown): string { if (value && typeof value === "object" && !Array.isArray(value)) { const record = value as Record<string, unknown>; return String(record.path ?? record.topic ?? record.entity ?? record.package ?? contentHash(value)); } return contentHash(value); }
