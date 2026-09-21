import { ContentCache } from "./store.js";
export function extractionCacheKey(cache: ContentCache, input: { content_hash: string; plugin_versions: Record<string, string>; rule_versions: Record<string, string>; scope: unknown }): string { return cache.key("extraction", input); }
