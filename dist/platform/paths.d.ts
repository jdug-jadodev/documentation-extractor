export declare function toPortablePath(path: string): string;
export declare function assertPortableRelativePath(path: string): string;
export declare function isContainedPath(root: string, candidate: string, caseInsensitive?: boolean): boolean;
export declare function resolveContainedPath(root: string, candidate: string): Promise<string>;
export declare function branchKey(branch: string): string;
