import type { Snapshot, SnapshotEntry, SnapshotReader } from "../contracts/types.js";
export declare class WorkingTreeSnapshotReader implements SnapshotReader {
    #private;
    readonly snapshot: Snapshot;
    private constructor();
    static capture(options: {
        root: string;
        repositoryId: string;
        baseCommit: string;
        paths: readonly string[];
        maxFileBytes?: number;
        signal?: AbortSignal;
    }): Promise<WorkingTreeSnapshotReader>;
    list(): Promise<readonly SnapshotEntry[]>;
    read(relativePath: string, options?: {
        maxBytes?: number;
        signal?: AbortSignal;
    }): Promise<Uint8Array>;
}
