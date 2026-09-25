import type { AnalysisIntent, CompiledContext, ContextBudget, DocumentationChunk, DocumentationLink } from "./types.js";
export declare function searchDocumentation(runRoot: string, query: string, options?: {
    repository?: string;
    limit?: number;
}): Promise<{
    schema_version: number;
    query: string;
    total: number;
    results: {
        score: number;
        chunk: DocumentationChunk;
    }[];
}>;
export declare function expandDocumentContext(runRoot: string, seedIds: readonly string[], depth?: number, limit?: number): Promise<{
    schema_version: number;
    seed_chunk_ids: readonly string[];
    depth: number;
    chunks: DocumentationChunk[];
    chunk_distances: {
        [k: string]: number;
    };
    relations: DocumentationLink[];
}>;
export declare function prepareAnalysisContext(input: {
    runId: string;
    runRoot: string;
    query: string;
    intent: AnalysisIntent;
    repository?: string;
    budget?: Partial<ContextBudget>;
}): Promise<CompiledContext>;
export declare function loadContext(runRoot: string, contextId: string): Promise<CompiledContext>;
