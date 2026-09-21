import type { AIExecutor, AIRequest, AIResultEnvelope } from "../contracts/types.js";
import type { ContractValidator } from "../contracts/validator.js";
export declare class CopilotCliExecutor implements AIExecutor {
    private readonly executable;
    private readonly cwd;
    private readonly validator;
    constructor(executable: string, cwd: string, validator: ContractValidator);
    execute(request: AIRequest): Promise<AIResultEnvelope>;
}
