import type { Inventory, SnapshotReader } from "../contracts/types.js";
export declare function buildInventory(reader: SnapshotReader, options?: {
    maxFileBytes?: number;
    maxFiles?: number;
}): Promise<Inventory>;
