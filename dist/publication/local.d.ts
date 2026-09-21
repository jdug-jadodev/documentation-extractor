import type { ApprovalReceipt, PublicationManifest, PublicationTarget } from "../contracts/types.js";
export declare class LocalPublicationTarget implements PublicationTarget {
    private readonly vaultRoot;
    private readonly publisherId;
    constructor(vaultRoot: string, publisherId: string);
    publish(candidateRoot: string, receipt: ApprovalReceipt, options: {
        signal?: AbortSignal;
    }): Promise<PublicationManifest>;
}
