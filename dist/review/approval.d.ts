import type { ApprovalReceipt } from "../contracts/types.js";
export declare function createApprovalReceipt(input: {
    runId: string;
    candidateRoot: string;
    actor: string;
    scope: string[];
    exceptions?: string[];
    humanAction: boolean;
}): Promise<ApprovalReceipt>;
export declare function validateApprovalReceipt(receipt: ApprovalReceipt, candidateRoot: string): Promise<void>;
export declare function hashCandidateFiles(root: string): Promise<Record<string, string>>;
