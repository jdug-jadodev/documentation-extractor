import type { TaskPacket } from "../contracts/types.js";
export interface ContextPart {
    packet: TaskPacket;
    byte_length: number;
    estimated_tokens: number;
    omitted_fact_ids: string[];
}
export declare function partitionContext(packet: TaskPacket, maxBytes?: number): ContextPart[];
