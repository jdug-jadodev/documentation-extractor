import type { Fact } from "./contracts/types.js";
export interface FactDiff {
    added: Fact[];
    removed: Fact[];
    modified: Array<{
        before: Fact;
        after: Fact;
    }>;
    unknown_changes: string[];
}
export declare function compareFacts(base: readonly Fact[], target: readonly Fact[], inputComplete?: boolean): FactDiff;
