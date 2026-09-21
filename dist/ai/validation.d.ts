import type { AgentResult, Evidence, Fact } from "../contracts/types.js";
import type { ContractValidator } from "../contracts/validator.js";
export declare function parseAndValidateAgentResult(text: string, validator: ContractValidator, expected: {
    task_id: string;
    role: AgentResult["role"];
    facts: readonly Fact[];
    evidence: readonly Evidence[];
}): AgentResult;
