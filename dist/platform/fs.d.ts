export declare function readJsonUnknown(path: string, maxBytes?: number): Promise<unknown>;
export declare function atomicWrite(path: string, data: string | Uint8Array): Promise<void>;
export interface FileLock {
    path: string;
    release(): Promise<void>;
}
export declare function acquireFileLock(path: string, owner: Record<string, unknown>): Promise<FileLock>;
