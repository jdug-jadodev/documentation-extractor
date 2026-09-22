import { cp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { atomicWrite } from "../platform/fs.js";
export async function restoreEditionIndex(vaultRoot, editionId, confirmed) {
    if (!confirmed)
        throw new Error("Restaurar una edición requiere confirmación humana.");
    const editionRoot = join(vaultRoot, "Publicaciones", editionId);
    await readFile(join(editionRoot, ".complete"), "utf8");
    const current = join(vaultRoot, "Actual");
    await rm(current, { recursive: true, force: true });
    await cp(editionRoot, current, { recursive: true, force: false, errorOnExist: true });
    await atomicWrite(join(vaultRoot, "Inicio.md"), `---\nedition_id: ${editionId}\n---\n\n# Documentación del equipo\n\nAbrir la documentación vigente: [[Actual/Inicio|Documentación actual]]\n\nEdición inmutable: [[Publicaciones/${editionId}/Inicio|${editionId}]]\n`);
}
export async function cleanupEditions(vaultRoot, keep, confirmed) {
    if (!confirmed)
        throw new Error("La limpieza de ediciones compartidas requiere vista previa y confirmación.");
    const current = await currentEdition(vaultRoot);
    const protectedIds = new Set([...keep, ...(current ? [current] : [])]);
    const editions = await readdir(join(vaultRoot, "Publicaciones"), { withFileTypes: true }).catch(() => []);
    const candidates = editions.filter((entry) => entry.isDirectory() && !protectedIds.has(entry.name)).map((entry) => entry.name).sort();
    for (const id of candidates)
        await rm(join(vaultRoot, "Publicaciones", id), { recursive: true, force: false });
    return candidates;
}
async function currentEdition(root) { try {
    return /edition_id:\s*([^\s]+)/u.exec(await readFile(join(root, "Inicio.md"), "utf8"))?.[1] ?? null;
}
catch {
    return null;
} }
//# sourceMappingURL=history.js.map