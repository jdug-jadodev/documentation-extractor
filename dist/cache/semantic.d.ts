import { ContentCache } from "./store.js";
export declare function semanticCacheKey(cache: ContentCache, input: {
    objective: string;
    fact_ids: string[];
    edge_ids: string[];
    conventions_hash: string;
    template_hash: string;
    skill_hash: string;
    profile_hash: string;
    model: string;
}): string;
