import type { Inventory, SnapshotReader } from "../contracts/types.js";
export declare function buildInventory(reader: SnapshotReader, options?: {
    maxFileBytes?: number;
    maxFiles?: number;
}): Promise<Inventory>;
/** Rebuild the current tree while reopening only files reported by Git as changed. */
export declare function buildIncrementalInventory(reader: SnapshotReader, previous: Inventory, changedPaths: ReadonlySet<string>, options?: {
    maxFileBytes?: number;
    maxFiles?: number;
}): Promise<Inventory>;
