import type { ContractValidator } from "./contracts/validator.js";
export interface RepositoryConfiguration {
    id: string;
    path: string;
    enabled: boolean;
    default_branch: string | null;
}
export interface KnowledgeConfiguration {
    schema_version: 3;
    setup_status: "configuration_pending" | "configured";
    workspace_file: string | null;
    vault_path: string;
    repositories: RepositoryConfiguration[];
    ai: {
        provider: "copilot-cli";
        model: string | null;
        strong_model: string | null;
        max_invocations: number;
    };
    sharing: {
        mode: "local" | "folder" | "export";
    };
    azure: {
        enabled: boolean;
        repository_url?: string;
        branch?: string;
    };
    overrides?: Record<string, unknown>;
}
export interface EffectiveConfiguration extends KnowledgeConfiguration {
    config_path: string;
    config_root: string;
    workspace_path: string | null;
    vault_root: string;
    repositories: Array<RepositoryConfiguration & {
        root: string;
    }>;
}
export declare function loadConfiguration(path: string, validator: ContractValidator): Promise<EffectiveConfiguration>;
export declare function saveConfiguration(path: string, config: KnowledgeConfiguration, validator: ContractValidator): Promise<void>;
export declare function stringifyConfiguration(config: KnowledgeConfiguration): string;
export declare function configurationState(config: EffectiveConfiguration): Promise<"configuration_pending" | "configured">;
export declare function canonicalizeConfiguredRoot(path: string): Promise<string>;
