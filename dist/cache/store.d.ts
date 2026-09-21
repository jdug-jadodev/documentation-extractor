export declare class ContentCache {
    #private;
    constructor(root: string);
    key(namespace: string, basis: unknown): string;
    get<T>(key: string): Promise<T | null>;
    put<T>(key: string, value: T, dependencies: string[]): Promise<void>;
}
