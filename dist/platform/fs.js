import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
export async function readJsonUnknown(path, maxBytes = 2 * 1024 * 1024) {
    const info = await stat(path);
    if (!info.isFile() || info.size > maxBytes)
        throw new Error(`JSON ausente o demasiado grande: ${path}`);
    return JSON.parse(await readFile(path, "utf8"));
}
export async function atomicWrite(path, data) {
    await mkdir(dirname(path), { recursive: true });
    const temporary = join(dirname(path), `.${randomUUID()}.tmp`);
    try {
        await writeFile(temporary, data, { flag: "wx", mode: 0o600 });
        await rename(temporary, path);
    }
    catch (error) {
        await rm(temporary, { force: true });
        throw error;
    }
}
export async function acquireFileLock(path, owner) {
    await mkdir(dirname(path), { recursive: true });
    const handle = await open(path, "wx", 0o600).catch((error) => {
        if (error.code === "EEXIST")
            throw new Error(`Otra operación mantiene el bloqueo: ${path}`);
        throw error;
    });
    await handle.writeFile(`${JSON.stringify(owner)}\n`, "utf8");
    await handle.close();
    let released = false;
    return {
        path,
        async release() {
            if (!released) {
                released = true;
                await rm(path, { force: true });
            }
        },
    };
}
//# sourceMappingURL=fs.js.map