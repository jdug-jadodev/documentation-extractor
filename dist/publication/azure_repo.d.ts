import type { PublicationManifest } from "../contracts/types.js";
export interface AzureExportPlan {
    enabled: boolean;
    checkout_root: string;
    remote: string;
    branch: string;
    files: string[];
    requires_push_confirmation: true;
}
export declare function planAzureRepositoryExport(config: {
    enabled: boolean;
    checkout_root?: string;
    remote?: string;
    branch?: string;
}, manifest: PublicationManifest): AzureExportPlan;
