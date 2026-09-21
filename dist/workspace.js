import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse, printParseErrorCode } from "jsonc-parser";
import { atomicWrite } from "./platform/fs.js";
import { isContainedPath } from "./platform/paths.js";
export async function readWorkspace(path) {
    const raw = await readFile(path, "utf8");
    if (Buffer.byteLength(raw) > 2 * 1024 * 1024)
        throw new Error("El archivo .code-workspace excede 2 MiB.");
    const errors = [];
    const value = parse(raw, errors, { allowTrailingComma: true, disallowComments: false, allowEmptyContent: false });
    if (errors.length > 0)
        throw new Error(`Workspace JSONC inválido: ${errors.map((error) => `${printParseErrorCode(error.error)}@${error.offset}`).join(", ")}`);
    if (!value || typeof value !== "object" || !Array.isArray(value.folders))
        throw new Error("El workspace no contiene folders[].");
    for (const folder of value.folders)
        if (!folder || typeof folder.path !== "string" || folder.path.length === 0)
            throw new Error("Cada carpeta del workspace necesita path.");
    return value;
}
export function workspaceRoots(workspacePath, descriptor) {
    const root = dirname(workspacePath);
    return descriptor.folders.map((folder) => resolve(root, folder.path));
}
export function isWorkspaceMember(candidate, roots) {
    return roots.some((root) => isContainedPath(root, candidate));
}
export async function writeManagedWorkspace(path, roots, existing) {
    const value = { ...(existing ?? {}), folders: roots.map((item) => ({ name: item.name, path: item.path })), "docsys.managed": { schema_version: 3 } };
    await atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}
export function reconcileWorkspace(configuredRoots, descriptorRoots) {
    const allowed = configuredRoots.filter((root) => isWorkspaceMember(root, descriptorRoots));
    const pending = descriptorRoots.filter((root) => !isWorkspaceMember(root, configuredRoots));
    const missing = configuredRoots.filter((root) => !isWorkspaceMember(root, descriptorRoots));
    return { allowed, pending, missing };
}
//# sourceMappingURL=workspace.js.map