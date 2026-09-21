import { ContentCache } from "./store.js";
export declare function graphCacheKey(cache: ContentCache, input: {
    bundle_hashes: string[];
    aliases: Record<string, string>;
    environment: string | null;
    rule_version: string;
}): string;
