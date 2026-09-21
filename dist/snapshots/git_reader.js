import { runRestrictedProcess } from "../platform/process.js";
import { assertPortableRelativePath } from "../platform/paths.js";
import { contentHash, stableId } from "../platform/hash.js";
export class GitSnapshotReader {
    snapshot;
    #git;
    #root;
    #entries;
    constructor(git, root, snapshot, entries) { this.#git = git; this.#root = root; this.snapshot = snapshot; this.#entries = entries; }
    static async create(options) {
        if (options.requestedRef.startsWith("-"))
            throw new Error("La referencia Git no puede comenzar con '-'.");
        const oidResult = await git(options, ["rev-parse", "--verify", `${options.requestedRef}^{commit}`], 4096);
        if (oidResult.exit_code !== 0)
            throw new Error(`Rama o commit no disponible localmente: ${options.requestedRef}`);
        const oid = oidResult.stdout.trim();
        if (!/^[0-9a-f]{40,64}$/u.test(oid))
            throw new Error("Git devolvió un OID inválido.");
        const treeResult = await git(options, ["ls-tree", "-rlz", "--full-tree", oid], 64 * 1024 * 1024);
        if (treeResult.exit_code !== 0)
            throw new Error(`No se pudo enumerar el árbol Git: ${sanitizeGitError(treeResult.stderr)}`);
        const entries = parseLsTree(treeResult.stdout);
        const content = [...entries.values()].map((entry) => [entry.relative_path, entry.object_id, entry.size, entry.mode]);
        const snapshot = { schema_version: 3, id: stableId("snapshot", options.repositoryId, oid, content), repository_id: options.repositoryId, requested_ref: options.requestedRef, resolved_ref: oid, commit_oid: oid, capture_mode: "git", content_hash: contentHash(content), dirty: false, captured_at: new Date().toISOString() };
        return new GitSnapshotReader(options.git, options.root, snapshot, entries);
    }
    async list() { return [...this.#entries.values()]; }
    async read(relativePath, options = {}) {
        const path = assertPortableRelativePath(relativePath);
        const entry = this.#entries.get(path);
        if (!entry || entry.kind !== "blob")
            throw new Error(`El archivo no pertenece al snapshot o no es blob: ${path}`);
        const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
        if (entry.size > maxBytes)
            throw new Error(`Archivo excede el límite (${entry.size} > ${maxBytes}): ${path}`);
        const result = await runRestrictedProcess({ executable: this.#git, args: ["-C", this.#root, "-c", `core.attributesFile=${nullDevice()}`, "cat-file", "blob", entry.object_id], cwd: this.#root, timeout_ms: 20_000, max_stdout_bytes: maxBytes, max_stderr_bytes: 8192, ...(options.signal === undefined ? {} : { signal: options.signal }), allowed_environment: { GIT_NO_LAZY_FETCH: "1" } });
        if (result.exit_code !== 0)
            throw new Error(`No se pudo leer el objeto local ${entry.object_id}: ${sanitizeGitError(result.stderr)}`);
        return Buffer.from(result.stdout, "utf8");
    }
}
async function git(options, args, maxStdout) {
    return await runRestrictedProcess({ executable: options.git, args: ["-C", options.root, "-c", `core.attributesFile=${nullDevice()}`, "-c", "diff.external=", ...args], cwd: options.root, timeout_ms: 30_000, max_stdout_bytes: maxStdout, max_stderr_bytes: 16 * 1024, ...(options.signal === undefined ? {} : { signal: options.signal }), allowed_environment: { GIT_NO_LAZY_FETCH: "1" } });
}
function parseLsTree(output) {
    const entries = new Map();
    for (const record of output.split("\0")) {
        if (!record)
            continue;
        const match = /^(\d+)\s+(blob|commit)\s+([0-9a-f]{40,64})\s+(\d+|-)\t([\s\S]+)$/u.exec(record);
        if (!match)
            throw new Error("Salida de git ls-tree no reconocida.");
        const [, mode = "", type = "", oid = "", rawSize = "", rawPath = ""] = match;
        const path = assertPortableRelativePath(rawPath);
        const kind = type === "commit" ? "submodule" : mode === "120000" ? "symlink" : "blob";
        entries.set(path, { relative_path: path, object_id: oid, size: rawSize === "-" ? 0 : Number(rawSize), mode, kind });
    }
    return entries;
}
function sanitizeGitError(value) { return value.replace(/[\r\n]+/gu, " ").slice(0, 500); }
function nullDevice() { return process.platform === "win32" ? "NUL" : "/dev/null"; }
//# sourceMappingURL=git_reader.js.map