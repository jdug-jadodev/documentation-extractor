export interface AstCall {
    name: string;
    receiver: string | null;
    expression: string;
    start: number;
    end: number;
}
export interface AstSymbol {
    name: string;
    symbol_type: "class" | "interface" | "enum" | "record" | "method" | "constructor" | "function";
    class_name: string | null;
    exported: boolean;
    visibility: string;
    static: boolean;
    async: boolean;
    parameters: Array<{
        name: string;
        type: string | null;
    }>;
    signature: string;
    calls: AstCall[];
    start: number;
    end: number;
    start_line: number;
    end_line: number;
    snippet: string;
}
export interface AstConstruction {
    variable: string | null;
    constructed_type: string;
    arguments: string[];
    owner_class: string | null;
    owner_symbol: string | null;
    start: number;
    end: number;
}
export interface AstInjection {
    class_name: string;
    parameter: string;
    dependency_type: string | null;
    start: number;
    end: number;
}
export interface AstAnalysis {
    symbols: AstSymbol[];
    constructions: AstConstruction[];
    injections: AstInjection[];
}
export interface GrammarParseResult {
    root: string;
    hasErrors: boolean;
    analysis: AstAnalysis;
}
export declare class GrammarManager {
    #private;
    constructor(root: string);
    verifyAll(): Promise<Array<{
        language: string;
        ok: boolean;
        reason?: string;
    }>>;
    parse(language: string, source: string): Promise<GrammarParseResult>;
}
