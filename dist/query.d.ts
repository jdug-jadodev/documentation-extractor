import type { Fact } from "./contracts/types.js";
export type QueryCategory = "endpoints" | "dependencies" | "messages" | "data" | "architecture" | "technologies" | "coverage" | "evidence";
export declare function queryFacts(facts: readonly Fact[], category: QueryCategory, options?: {
    componentId?: string;
    offset?: number;
    limit?: number;
}): {
    total: number;
    offset: number;
    limit: number;
    items: Fact[];
    complete: boolean;
};
export declare function renderFactTable(result: ReturnType<typeof queryFacts>): string;
