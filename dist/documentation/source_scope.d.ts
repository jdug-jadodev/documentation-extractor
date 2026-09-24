import type { Fact, KnowledgeGraph } from "../contracts/types.js";
/** Returns true when a path belongs to test-only source code. */
export declare function isTestSourcePath(input: string): boolean;
/** Classifies a fact without discarding the raw analysis artifact that produced it. */
export declare function isTestFact(fact: Fact): boolean;
/** Facts eligible for user-facing production documentation. */
export declare function productionFacts(facts: readonly Fact[]): Fact[];
/** Removes graph relations that are supported only by excluded test facts. */
export declare function graphForFacts(graph: KnowledgeGraph, facts: readonly Fact[]): KnowledgeGraph;
