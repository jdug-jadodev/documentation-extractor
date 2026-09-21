import type { PublicationManifest } from "../contracts/types.js";
export declare const PUBLICATION_ALLOWLIST: RegExp;
export declare function createPublicationManifest(input: {
    editionId: string;
    runId: string;
    root: string;
    previousEditionId: string | null;
}): Promise<PublicationManifest>;
export declare function verifyPublicationManifest(root: string, manifest: PublicationManifest): Promise<void>;
