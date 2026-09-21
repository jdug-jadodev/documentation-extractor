import { type KnowledgeConfiguration } from "./config.js";
import type { ContractValidator } from "./contracts/validator.js";
export interface MigrationDecision {
    source: string;
    source_key: string;
    destination_key: string;
    decision: "migrate" | "historical" | "credential" | "conflict";
    value: unknown;
}
export interface MigrationPlan {
    schema_version: 3;
    source_path: string;
    source_hash: string;
    target: KnowledgeConfiguration;
    decisions: MigrationDecision[];
    conflicts: string[];
}
export declare function planLegacyMigration(manifestInput: string): Promise<MigrationPlan>;
export declare function applyLegacyMigration(options: {
    projectRoot: string;
    configPath: string;
    plan: MigrationPlan;
    validator: ContractValidator;
}): Promise<string>;
export declare function restoreLegacyConfiguration(destinationPath: string, receiptPath: string): Promise<void>;
