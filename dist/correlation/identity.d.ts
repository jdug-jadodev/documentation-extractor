import type { Fact, GraphNode, Scenario } from "../contracts/types.js";
export interface IdentityResolution {
    nodes: GraphNode[];
    aliases: Map<string, string>;
    conflicts: Array<{
        alias: string;
        candidates: string[];
    }>;
}
export declare function resolveIdentities(facts: readonly Fact[], scenario: Scenario): IdentityResolution;
export declare function normalizeAlias(value: string): string;
export declare function asRecord(value: unknown): Record<string, unknown>;
