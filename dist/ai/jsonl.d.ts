export interface CopilotEvent {
    type?: string;
    data?: unknown;
    content?: unknown;
    [key: string]: unknown;
}
export declare class JsonlEventDecoder {
    #private;
    constructor(maxBytes?: number);
    push(chunk: Uint8Array): CopilotEvent[];
    finish(): CopilotEvent[];
}
export declare function extractFinalResponse(events: readonly CopilotEvent[]): {
    response: string;
    model: string | null;
    usage: Record<string, unknown> | null;
};
