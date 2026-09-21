import { readdir, rm, lstat } from "node:fs/promises";
import { join } from "node:path";
import { isContainedPath } from "./platform/paths.js";
export async function cleanPrivateCache(cacheRoot, referencedKeys) {
    const removed = [];
    for (const entry of await readdir(cacheRoot, { withFileTypes: true }).catch(() => [])) {
        const path = join(cacheRoot, entry.name);
        if (!isContainedPath(cacheRoot, path))
            throw new Error("Ruta de limpieza fuera del caché autorizado.");
        const info = await lstat(path);
        if (info.isSymbolicLink())
            continue;
        if (!referencedKeys.has(entry.name)) {
            await rm(path, { recursive: entry.isDirectory(), force: true });
            removed.push(entry.name);
        }
    }
    return removed;
}
//# sourceMappingURL=maintenance.js.map