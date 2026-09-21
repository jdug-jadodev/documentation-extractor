import type { Snapshot, SnapshotEntry, SnapshotReader } from "../contracts/types.js";
export declare class GitSnapshotReader implements SnapshotReader {
    #private;
    readonly snapshot: Snapshot;
    private constructor();
    static create(options: {
        git: string;
        root: string;
        repositoryId: string;
        requestedRef: string;
        signal?: AbortSignal;
    }): Promise<GitSnapshotReader>;
    list(): Promise<readonly SnapshotEntry[]>;
    read(relativePath: string, options?: {
        maxBytes?: number;
        signal?: AbortSignal;
    }): Promise<Uint8Array>;
}
