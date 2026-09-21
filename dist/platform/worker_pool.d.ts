export declare class BoundedWorkerPool<Input, Output> {
    #private;
    constructor(workerUrl: URL, size?: number);
    run(input: Input, options?: {
        signal?: AbortSignal;
        timeoutMs?: number;
    }): Promise<Output>;
    close(): Promise<void>;
}
