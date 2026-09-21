import { ContentCache } from "./store.js";
export declare function extractionCacheKey(cache: ContentCache, input: {
    content_hash: string;
    plugin_versions: Record<string, string>;
    rule_versions: Record<string, string>;
    scope: unknown;
}): string;
