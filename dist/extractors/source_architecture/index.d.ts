import type { CandidateStack, ExtractionOptions, ExtractionResult, ExtractorPlugin, Fact, Inventory, SnapshotReader } from "../../contracts/types.js";
export declare class SourceArchitecturePlugin implements ExtractorPlugin {
    readonly id = "source-architecture";
    readonly version = "2.1.0";
    readonly supported_languages: readonly ["javascript", "typescript", "tsx", "java"];
    readonly capabilities: {
        readonly modules: "implemented";
        readonly symbols: "implemented";
        readonly calls: "implemented";
        readonly composition: "implemented";
        readonly imports: "implemented";
        readonly manifests: "implemented";
    };
    readonly rule_versions: {
        readonly "repository.file": "1";
        readonly "repository.build-module": "1";
        readonly "repository.build-dependency": "1";
        readonly "source.module": "2";
        readonly "source.symbol": "4";
        readonly "source.call": "1";
        readonly "source.construction": "1";
        readonly "source.injection": "2";
        readonly "source.binding": "1";
        readonly "source.type-relation": "1";
        readonly "source.import": "2";
        readonly "package.dependencies": "1";
        readonly "package.scripts": "1";
        readonly "package.runtime": "1";
    };
    detect(inventory: Inventory): Promise<CandidateStack[]>;
    extract(reader: SnapshotReader, component: CandidateStack, options: ExtractionOptions): Promise<ExtractionResult>;
}
export declare function createSourceArchitecturePlugin(): ExtractorPlugin;
export declare function resolveSourceSemanticFacts(facts: readonly Fact[]): Fact[];
