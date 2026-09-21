export declare function restoreEditionIndex(vaultRoot: string, editionId: string, confirmed: boolean): Promise<void>;
export declare function cleanupEditions(vaultRoot: string, keep: readonly string[], confirmed: boolean): Promise<string[]>;
