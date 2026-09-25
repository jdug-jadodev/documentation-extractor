import { type ErrorObject } from "ajv/dist/2020.js";
import type { AgentResult, Evidence, Fact, Snapshot } from "./types.js";
declare const SCHEMA_FILES: readonly ["config", "snapshot", "evidence", "fact", "bundle", "graph", "task-packet", "agent-result", "document", "review", "approval", "publication", "proposal", "run"];
export type SchemaName = typeof SCHEMA_FILES[number];
export declare class ContractValidationError extends Error {
    readonly schema: string;
    readonly errors: ErrorObject[];
    constructor(schema: string, errors: ErrorObject[]);
}
export declare class ContractValidator {
    #private;
    private constructor();
    static create(packageRoot: string): Promise<ContractValidator>;
    assert<T>(schema: SchemaName, value: unknown): asserts value is T;
    validateReferences(input: {
        facts: Fact[];
        evidence: Evidence[];
        snapshots: Snapshot[];
    }): void;
    assertAgentResultReferences(result: AgentResult, knownFactIds: ReadonlySet<string>, knownEvidenceIds: ReadonlySet<string>): void;
}
export {};
