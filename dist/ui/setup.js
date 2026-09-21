import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { resolve, relative, dirname } from "node:path";
import { saveConfiguration } from "../config.js";
import { readWorkspace, workspaceRoots } from "../workspace.js";
export async function runSetup(configPath, validator) {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
        stdout.write("\nCONFIGURACIÓN — 1/5 Workspace\n");
        const workspaceInput = (await rl.question("Ruta del archivo .code-workspace (vacío para cancelar): ")).trim();
        if (!workspaceInput)
            return null;
        const workspacePath = resolve(workspaceInput);
        const descriptor = await readWorkspace(workspacePath);
        const roots = workspaceRoots(workspacePath, descriptor);
        stdout.write("\nCONFIGURACIÓN — 2/5 Autorización\n");
        const repositories = [];
        for (const [index, root] of roots.entries()) {
            const idDefault = descriptor.folders[index]?.name ?? `repo-${index + 1}`;
            const id = (await rl.question(`ID para ${root} [${idDefault}]: `)).trim() || idDefault;
            const enabled = /^s(i)?$/iu.test((await rl.question(`¿Habilitar ${id}? [s/N]: `)).trim());
            const branch = (await rl.question(`Rama principal de ${id} (vacío = pendiente): `)).trim() || null;
            repositories.push({ id, path: relative(dirname(configPath), root), enabled, default_branch: branch });
        }
        stdout.write("\nCONFIGURACIÓN — 3/5 Boveda\n");
        const vaultInput = (await rl.question("Ruta de boveda [./boveda]: ")).trim() || "./boveda";
        stdout.write("\nCONFIGURACIÓN — 4/5 Copilot (opcional)\n");
        const model = (await rl.question("Modelo permitido (vacío = sin IA): ")).trim() || null;
        const config = { schema_version: 3, setup_status: "configured", workspace_file: relative(dirname(configPath), workspacePath), vault_path: vaultInput, repositories, ai: { provider: "copilot-cli", model, strong_model: null, max_invocations: 8 }, sharing: { mode: "local" }, azure: { enabled: false } };
        stdout.write("\nCONFIGURACIÓN — 5/5 Resumen\n");
        stdout.write(`${JSON.stringify({ workspace: workspacePath, repositories: repositories.map((item) => ({ id: item.id, enabled: item.enabled })), vault: resolve(dirname(configPath), vaultInput), ai_model: model, azure: false, automatic_analysis: false }, null, 2)}\n`);
        if (!/^s(i)?$/iu.test((await rl.question("¿Guardar esta configuración? [s/N]: ")).trim()))
            return null;
        await saveConfiguration(configPath, config, validator);
        return config;
    }
    finally {
        rl.close();
    }
}
//# sourceMappingURL=setup.js.map