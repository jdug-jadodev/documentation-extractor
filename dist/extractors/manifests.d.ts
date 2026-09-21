export type ManifestKind = "json" | "jsonc" | "yaml" | "xml" | "toml";
export declare function parseManifest(text: string, kind: ManifestKind, limits?: {
    maxBytes?: number;
    maxDepth?: number;
}): unknown;
