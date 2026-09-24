import type { Fact, KnowledgeGraph } from "../contracts/types.js";
import { type ResolvedEndpoint } from "./model.js";
export interface SemanticSymbol {
    id: string;
    name: string;
    class_name: string | null;
    symbol_type: string;
    signature: string;
    description: string;
    source_path: string;
    start_line: number | null;
    end_line: number | null;
    snippet: string;
}
export interface SemanticCall {
    caller_symbol_id: string;
    target_symbol_id: string | null;
    callee_name: string;
    receiver: string | null;
    expression: string;
    resolution: string;
}
export interface SemanticFlow {
    endpoint: ResolvedEndpoint;
    start_symbol_id: string | null;
    symbols: SemanticSymbol[];
    calls: SemanticCall[];
    data: Array<{
        kind: string;
        entity: string;
        operation: string;
        source_path: string;
        evidence_ids: string[];
    }>;
    integrations: Array<{
        method: string;
        target: string;
        source_path: string;
        evidence_ids: string[];
    }>;
    limitations: string[];
}
export declare function semanticFlows(component: string, facts: readonly Fact[]): SemanticFlow[];
export declare function traceEndpointFlow(endpoint: ResolvedEndpoint, facts: readonly Fact[], maxDepth?: number, maxSymbols?: number, maxCalls?: number): SemanticFlow;
export declare function explainServiceFromFacts(runId: string, component: string, facts: readonly Fact[], graph: KnowledgeGraph, symbolLimit?: number): {
    schema_version: number;
    run_id: string;
    component: string;
    summary: {
        endpoints: number;
        classes: number;
        symbols: number;
        relations: number;
    };
    technologies: string[];
    endpoints: {
        method: string;
        path: string;
        handler: string;
        source_path: string;
        status: string;
    }[];
    relations: {
        direction: string;
        type: "calls_http" | "consumes_from" | "depends_on_package" | "publishes_to" | "reads_data" | "writes_data";
        from: string;
        to: string;
        status: "candidate" | "supported" | "unresolved";
        limitations: string[];
    }[];
    classes: {
        name: string;
        methods: Array<{
            name: string;
            signature: string;
            description: string;
            source_path: string;
            start_line: number | null;
        }>;
    }[];
    standalone_symbols: {
        id: string;
        class_name: string | null;
        name: string;
        type: string;
        signature: string;
        description: string;
        source_path: string;
        start_line: number | null;
    }[];
    truncated: boolean;
};
export declare function explainEndpointFromFacts(runId: string, component: string, method: string, path: string, facts: readonly Fact[]): {
    schema_version: number;
    run_id: string;
    component: string;
    method: string;
    path: string;
    status: string;
    limitations: string[];
    endpoint?: never;
    steps?: never;
    calls?: never;
    data?: never;
    integrations?: never;
} | {
    method?: never;
    path?: never;
    schema_version: number;
    run_id: string;
    component: string;
    status: string;
    endpoint: ResolvedEndpoint;
    steps: {
        id: string;
        class_name: string | null;
        name: string;
        type: string;
        signature: string;
        description: string;
        source_path: string;
        start_line: number | null;
    }[];
    calls: SemanticCall[];
    data: {
        kind: string;
        entity: string;
        operation: string;
        source_path: string;
        evidence_ids: string[];
    }[];
    integrations: {
        method: string;
        target: string;
        source_path: string;
        evidence_ids: string[];
    }[];
    limitations: string[];
};
