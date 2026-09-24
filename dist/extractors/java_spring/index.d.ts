import type { CandidateStack, ExtractionOptions, ExtractionResult, ExtractorPlugin, Inventory, SnapshotReader } from "../../contracts/types.js";
export declare class JavaSpringPlugin implements ExtractorPlugin {
    readonly id = "java-spring";
    readonly version = "2.0.0";
    readonly supported_languages: readonly ["java", "xml"];
    readonly capabilities: {
        readonly http_endpoints: "implemented";
    };
    readonly rule_versions: {
        readonly "spring.annotated-endpoint": "2";
    };
    detect(inventory: Inventory): Promise<CandidateStack[]>;
    extract(reader: SnapshotReader, component: CandidateStack, options: ExtractionOptions): Promise<ExtractionResult>;
}
export declare function createJavaSpringPlugin(): ExtractorPlugin;
