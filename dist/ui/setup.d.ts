import type { KnowledgeConfiguration } from "../config.js";
import type { ContractValidator } from "../contracts/validator.js";
export declare function runSetup(configPath: string, validator: ContractValidator): Promise<KnowledgeConfiguration | null>;
