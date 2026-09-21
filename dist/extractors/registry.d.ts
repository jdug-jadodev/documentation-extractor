import type { ExtractorPlugin } from "../contracts/types.js";
export declare class PluginRegistry {
    #private;
    constructor(plugins?: readonly ExtractorPlugin[]);
    get(id: string): ExtractorPlugin | undefined;
    list(): readonly ExtractorPlugin[];
    require(id: string): ExtractorPlugin;
}
export declare function builtInPlugins(): ExtractorPlugin[];
export declare function capabilityMatrix(registry?: PluginRegistry): {
    schema_version: number;
    plugins: {
        id: string;
        version: string;
        languages: readonly string[];
        capabilities: Readonly<Record<string, import("../contracts/types.js").CapabilityStatus>>;
        rules: Readonly<Record<string, string>>;
    }[];
};
