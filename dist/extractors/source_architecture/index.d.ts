import type { CandidateStack, ExtractionOptions, ExtractionResult, ExtractorPlugin, Inventory, SnapshotReader } from "../../contracts/types.js";
export declare class SourceArchitecturePlugin implements ExtractorPlugin {
    readonly id = "source-architecture";
    readonly version = "1.1.0";
    readonly supported_languages: readonly ["javascript", "typescript", "tsx"];
    readonly capabilities: {
        readonly modules: "implemented";
        readonly symbols: "partial";
        readonly imports: "implemented";
        readonly manifests: "implemented";
    };
    readonly rule_versions: {
        readonly "source.module": "1";
        readonly "source.symbol": "2";
        readonly "source.import": "1";
        readonly "package.dependencies": "1";
        readonly "package.scripts": "1";
        readonly "package.runtime": "1";
    };
    detect(inventory: Inventory): Promise<CandidateStack[]>;
    extract(reader: SnapshotReader, component: CandidateStack, options: ExtractionOptions): Promise<ExtractionResult>;
}
export declare function createSourceArchitecturePlugin(): ExtractorPlugin;
