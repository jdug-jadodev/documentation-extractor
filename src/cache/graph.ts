import { ContentCache } from "./store.js";
export function graphCacheKey(cache: ContentCache, input: { bundle_hashes: string[]; aliases: Record<string, string>; environment: string | null; rule_version: string }): string { return cache.key("graph", input); }
