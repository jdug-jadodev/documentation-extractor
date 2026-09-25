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
    state_path?: string;
    repositories: RepositoryConfiguration[];
    documentation?: {
        include_tests: false;
    };
    documentation_intelligence?: {
        enabled: boolean;
        max_context_tokens: number;
        max_documents: number;
        max_flows: number;
        max_symbols: number;
        max_documents_per_repository: number;
        include_tests_by_default: false;
    };
    investigation?: {
        max_dependency_depth: number;
        default_max_files: number;
        hard_max_files: number;
        default_max_bytes: number;
        hard_max_bytes: number;
        allow_repository_wide_scan: false;
    };
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
    state_root: string;
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
