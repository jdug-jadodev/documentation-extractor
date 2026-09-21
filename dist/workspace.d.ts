export interface WorkspaceFolder {
    name?: string;
    path: string;
}
export interface WorkspaceDescriptor {
    folders: WorkspaceFolder[];
    settings?: Record<string, unknown>;
    tasks?: Record<string, unknown>;
    [key: string]: unknown;
}
export declare function readWorkspace(path: string): Promise<WorkspaceDescriptor>;
export declare function workspaceRoots(workspacePath: string, descriptor: WorkspaceDescriptor): string[];
export declare function isWorkspaceMember(candidate: string, roots: readonly string[]): boolean;
export declare function writeManagedWorkspace(path: string, roots: Array<{
    name: string;
    path: string;
}>, existing?: WorkspaceDescriptor): Promise<void>;
export declare function reconcileWorkspace(configuredRoots: readonly string[], descriptorRoots: readonly string[]): {
    allowed: string[];
    pending: string[];
    missing: string[];
};
