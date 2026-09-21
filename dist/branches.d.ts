export interface BranchIdentity {
    original: string;
    key: string;
}
export declare function identifyBranches(branches: readonly string[]): BranchIdentity[];
