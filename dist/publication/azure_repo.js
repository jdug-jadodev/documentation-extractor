export function planAzureRepositoryExport(config, manifest) {
    if (!config.enabled)
        throw new Error("Azure Repo está desactivado; la boveda local sigue disponible.");
    if (!config.checkout_root || !config.remote || !config.branch)
        throw new Error("Configuración Azure Repo incompleta.");
    return { enabled: true, checkout_root: config.checkout_root, remote: config.remote, branch: config.branch, files: manifest.files.map((file) => file.path), requires_push_confirmation: true };
}
//# sourceMappingURL=azure_repo.js.map