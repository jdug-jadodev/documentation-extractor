import type { PublicationManifest } from "../contracts/types.js";
export interface AzureExportPlan { enabled: boolean; checkout_root: string; remote: string; branch: string; files: string[]; requires_push_confirmation: true; }
export function planAzureRepositoryExport(config: { enabled: boolean; checkout_root?: string; remote?: string; branch?: string }, manifest: PublicationManifest): AzureExportPlan {
  if (!config.enabled) throw new Error("Azure Repo está desactivado; la boveda local sigue disponible.");
  if (!config.checkout_root || !config.remote || !config.branch) throw new Error("Configuración Azure Repo incompleta.");
  return { enabled: true, checkout_root: config.checkout_root, remote: config.remote, branch: config.branch, files: manifest.files.map((file) => file.path), requires_push_confirmation: true };
}
