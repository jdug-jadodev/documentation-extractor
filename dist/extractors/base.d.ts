import type { CandidateStack, ExtractionOptions, ExtractionResult, ExtractorPlugin, Inventory, SnapshotReader } from "../contracts/types.js";
export interface PatternRule {
    id: string;
    version: string;
    capability: string;
    languages: readonly string[];
    file: RegExp;
    pattern: RegExp;
    factKind: string;
    map(match: RegExpExecArray, context: {
        path: string;
        componentId: string;
    }): unknown;
}
export declare class PatternExtractorPlugin implements ExtractorPlugin {
    #private;
    readonly id: string;
    readonly version: string;
    readonly supported_languages: readonly string[];
    readonly capabilities: Readonly<Record<string, "implemented" | "partial" | "unsupported">>;
    readonly rule_versions: Readonly<Record<string, string>>;
    constructor(options: {
        id: string;
        version: string;
        languages: readonly string[];
        capabilities: Readonly<Record<string, "implemented" | "partial" | "unsupported">>;
        rules: readonly PatternRule[];
    });
    detect(inventory: Inventory): Promise<CandidateStack[]>;
    extract(reader: SnapshotReader, component: CandidateStack, options: ExtractionOptions): Promise<ExtractionResult>;
}
export declare function method(value: string | undefined, fallback?: string): string;
export declare function pathValue(value: string | undefined): string;
