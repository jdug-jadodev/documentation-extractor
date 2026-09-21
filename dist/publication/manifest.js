import { readdir, readFile, lstat } from "node:fs/promises";
import { join, relative } from "node:path";
import { sha256, compareBytes } from "../platform/hash.js";
import { assertPortableRelativePath } from "../platform/paths.js";
export const PUBLICATION_ALLOWLIST = /^(?:Inicio\.md|BORRADOR - NO APROBADO\.md|Servicios\/.*\.(?:md|json)|Mapas\/.*\.md|Decisiones\/.*\.md|Especificaciones\/.*\.md|edicion\.json)$/iu;
export async function createPublicationManifest(input) {
    const paths = await listFiles(input.root);
    const files = [];
    for (const path of paths.sort(compareBytes)) {
        const portable = assertPortableRelativePath(relative(input.root, path).replaceAll("\\", "/"));
        if (!PUBLICATION_ALLOWLIST.test(portable) || portable === "BORRADOR - NO APROBADO.md")
            continue;
        const bytes = await readFile(path);
        files.push({ path: portable, sha256: sha256(bytes), size: bytes.byteLength });
    }
    return { schema_version: 3, edition_id: input.editionId, run_id: input.runId, created_at: new Date().toISOString(), previous_edition_id: input.previousEditionId, files, complete: true };
}
export async function verifyPublicationManifest(root, manifest) {
    for (const file of manifest.files) {
        const bytes = await readFile(join(root, ...file.path.split("/")));
        if (bytes.byteLength !== file.size || sha256(bytes) !== file.sha256)
            throw new Error(`Archivo de edición alterado o incompleto: ${file.path}`);
    }
}
async function listFiles(root) { const result = []; for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    const info = await lstat(path);
    if (info.isSymbolicLink())
        throw new Error(`No se publican enlaces simbólicos: ${path}`);
    if (info.isDirectory())
        result.push(...await listFiles(path));
    else if (info.isFile())
        result.push(path);
} return result; }
//# sourceMappingURL=manifest.js.map