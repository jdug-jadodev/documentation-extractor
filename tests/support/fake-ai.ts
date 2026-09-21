import type { AIExecutor, AIRequest, AIResultEnvelope } from "../../src/contracts/types.js";
export class FailingDeterministicProvider implements AIExecutor { calls = 0; async execute(_request: AIRequest): Promise<AIResultEnvelope> { this.calls += 1; throw new Error("AI invocation forbidden in deterministic test"); } }
