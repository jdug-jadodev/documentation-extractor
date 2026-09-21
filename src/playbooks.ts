import type { AgentRole } from "./contracts/types.js";

export type RequestType = "inventory" | "endpoints" | "describe-service" | "explain-connection" | "refresh-docs" | "specification" | "migration" | "adr";
export interface PlannedTask { id: string; role: AgentRole | "query" | "extract" | "graph" | "validate"; operation: string; dependencies: string[]; }
export interface RequestPlan { schema_version: 3; request_type: RequestType; repository_ids: string[]; snapshot_ids: string[]; scope: "inventory" | "standard" | "full" | "targeted"; operation: string; tasks: PlannedTask[]; dependencies: Array<[string, string]>; required_confirmations: string[]; unknowns: string[]; }

export function createRequestPlan(input: { type: RequestType; repository_ids: string[]; snapshot_ids?: string[]; scope?: "inventory" | "standard" | "full" | "targeted"; highImpact?: boolean; strongModel?: boolean }): RequestPlan {
  const tasks: PlannedTask[] = [];
  const add = (id: string, role: PlannedTask["role"], operation: string, dependencies: string[] = []) => tasks.push({ id, role, operation, dependencies });
  if (input.type === "inventory") add("inventory", "inventory", "inventory");
  if (["endpoints", "describe-service", "explain-connection", "refresh-docs", "specification", "migration", "adr"].includes(input.type)) { add("extract", "extract", "extract"); if (input.type === "endpoints") add("query", "query", "endpoints", ["extract"]); }
  if (["explain-connection", "refresh-docs", "specification", "migration", "adr"].includes(input.type)) add("graph", "graph", "correlate", ["extract"]);
  if (["describe-service", "refresh-docs", "specification", "migration", "adr"].includes(input.type)) { add("document", "documentation", "describe-service", input.type === "describe-service" ? ["extract"] : ["graph"]); add("validate", "validate", "review-mechanical", ["document"]); }
  if (input.type === "explain-connection") add("integrate", "integration", "explain-connection", ["graph"]);
  if (["specification", "migration", "adr"].includes(input.type)) add("proposal", "proposal", input.type, ["validate"]);
  const confirmations = [] as string[];
  if ((input.scope ?? "standard") === "full") confirmations.push("scope_full");
  if (input.highImpact) confirmations.push("high_impact");
  if (input.strongModel) confirmations.push("strong_model");
  return { schema_version: 3, request_type: input.type, repository_ids: [...input.repository_ids], snapshot_ids: [...(input.snapshot_ids ?? [])], scope: input.scope ?? "standard", operation: input.type, tasks, dependencies: tasks.flatMap((task) => task.dependencies.map((dependency) => [dependency, task.id] as [string, string])), required_confirmations: confirmations, unknowns: [] };
}

export function planMenuRequest(type: RequestType, repositoryIds: string[]): RequestPlan { return createRequestPlan({ type, repository_ids: repositoryIds }); }
