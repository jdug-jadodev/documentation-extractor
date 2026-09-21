import { lstat, readFile, realpath } from "node:fs/promises";
import { basename } from "node:path";
import { assertPortableRelativePath, resolveContainedPath } from "../platform/paths.js";
import { contentHash, sha256, stableId } from "../platform/hash.js";
const SENSITIVE_NAME = /^(?:\.env(?:\..*)?|\.npmrc|\.pypirc|id_(?:rsa|dsa|ecdsa|ed25519)|credentials?|secrets?)(?:\..*)?$/iu;
const EXCLUDED_SEGMENT = /^(?:\.git|\.knowledge|node_modules|dist|build|bin|obj|target|coverage)$/iu;
export class WorkingTreeSnapshotReader {
    snapshot;
    #entries;
    #bytes;
    constructor(snapshot, entries, bytes) {
        this.snapshot = snapshot;
        this.#entries = entries;
        this.#bytes = bytes;
    }
    static async capture(options) {
        const root = await realpath(options.root);
        const portablePaths = [...new Set(options.paths.map((item) => assertPortableRelativePath(item)))];
        if (portablePaths.length === 0)
            throw new Error("Seleccione al menos un archivo local.");
        for (const path of portablePaths)
            assertAllowedLocalPath(path);
        const maxFileBytes = options.maxFileBytes ?? 2 * 1024 * 1024;
        let captured = await captureOnce(root, portablePaths, maxFileBytes, options.signal);
        if (!await isStable(root, captured.entries, options.signal)) {
            captured = await captureOnce(root, portablePaths, maxFileBytes, options.signal);
            if (!await isStable(root, captured.entries, options.signal))
                throw new Error("Los archivos locales cambiaron durante la captura después de un reintento.");
        }
        const manifest = [...captured.entries.values()].map((entry) => [entry.relative_path, entry.object_id, entry.size]);
        const snapshot = { schema_version: 3, id: stableId("snapshot-working", options.repositoryId, options.baseCommit, manifest), repository_id: options.repositoryId, requested_ref: "working_tree", resolved_ref: options.baseCommit, commit_oid: options.baseCommit, capture_mode: "working_tree", content_hash: contentHash(manifest), dirty: true, captured_at: new Date().toISOString() };
        return new WorkingTreeSnapshotReader(snapshot, captured.entries, captured.bytes);
    }
    async list() { return [...this.#entries.values()]; }
    async read(relativePath, options = {}) {
        if (options.signal?.aborted)
            throw Object.assign(new Error("Operación cancelada."), { code: "ABORT_ERR" });
        const portable = assertPortableRelativePath(relativePath);
        const entry = this.#entries.get(portable);
        const bytes = this.#bytes.get(portable);
        if (!entry || !bytes)
            throw new Error(`Ruta fuera de la captura: ${portable}`);
        if (entry.size > (options.maxBytes ?? 2 * 1024 * 1024))
            throw new Error(`Archivo excede el límite: ${portable}`);
        return bytes.slice();
    }
}
async function captureOnce(root, paths, maxFileBytes, signal) {
    const entries = new Map();
    const bytes = new Map();
    for (const portable of paths) {
        if (signal?.aborted)
            throw Object.assign(new Error("Operación cancelada."), { code: "ABORT_ERR" });
        const path = await resolveContainedPath(root, portable);
        const info = await lstat(path);
        if (!info.isFile() || info.isSymbolicLink())
            throw new Error(`La ruta local no es un archivo regular permitido: ${portable}`);
        if (info.size > maxFileBytes)
            throw new Error(`Archivo local excede el límite: ${portable}`);
        const content = await readFile(path);
        const digest = sha256(content);
        entries.set(portable, { relative_path: portable, object_id: digest, size: content.byteLength, mode: "working", kind: "blob" });
        bytes.set(portable, content);
    }
    return { entries, bytes };
}
async function isStable(root, entries, signal) {
    for (const entry of entries.values()) {
        if (signal?.aborted)
            throw Object.assign(new Error("Operación cancelada."), { code: "ABORT_ERR" });
        const bytes = await readFile(await resolveContainedPath(root, entry.relative_path));
        if (bytes.byteLength !== entry.size || sha256(bytes) !== entry.object_id)
            return false;
    }
    return true;
}
function assertAllowedLocalPath(path) {
    const segments = path.split("/");
    if (segments.some((segment) => EXCLUDED_SEGMENT.test(segment)))
        throw new Error(`Ruta local excluida: ${path}`);
    if (SENSITIVE_NAME.test(basename(path)))
        throw new Error(`Archivo sensible no permitido en una captura local: ${path}`);
}
//# sourceMappingURL=working_tree.js.map