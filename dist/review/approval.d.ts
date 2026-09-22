import type { ApprovalReceipt } from "../contracts/types.js";
export declare function createAutomaticPublicationReceipt(input: {
    runId: string;
    candidateRoot: string;
    scope: string[];
    exceptions?: string[];
}): Promise<ApprovalReceipt>;
export declare function validateApprovalReceipt(receipt: ApprovalReceipt, candidateRoot: string): Promise<void>;
export declare function hashCandidateFiles(root: string): Promise<Record<string, string>>;
