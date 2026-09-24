import type { CandidateStack, ExtractionOptions, ExtractionResult, ExtractorPlugin, Inventory, SnapshotReader } from "../../contracts/types.js";
export declare class JavaWebFluxPlugin implements ExtractorPlugin {
    readonly id = "java-webflux";
    readonly version = "1.0.0";
    readonly supported_languages: readonly ["java"];
    readonly capabilities: {
        readonly functional_routes: "implemented";
        readonly reactive_pipelines: "partial";
        readonly webclient: "partial";
    };
    readonly rule_versions: {
        readonly "webflux.functional-route": "1";
        readonly "webflux.reactive-pipeline": "1";
        readonly "webflux.webclient": "1";
    };
    detect(inventory: Inventory): Promise<CandidateStack[]>;
    extract(reader: SnapshotReader, component: CandidateStack, options: ExtractionOptions): Promise<ExtractionResult>;
}
export declare function createJavaWebFluxPlugin(): ExtractorPlugin;
