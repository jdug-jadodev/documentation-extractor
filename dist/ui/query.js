import { queryFacts, renderFactTable } from "../query.js";
export function presentQuery(facts, category, componentId) { return renderFactTable(queryFacts(facts, category, componentId === undefined ? {} : { componentId })); }
//# sourceMappingURL=query.js.map