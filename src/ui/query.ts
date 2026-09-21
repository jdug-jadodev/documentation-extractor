import type { Fact } from "../contracts/types.js";
import { queryFacts, renderFactTable, type QueryCategory } from "../query.js";
export function presentQuery(facts: Fact[], category: QueryCategory, componentId?: string): string { return renderFactTable(queryFacts(facts, category, componentId === undefined ? {} : { componentId })); }
