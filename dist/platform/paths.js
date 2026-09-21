import { realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve, sep } from "node:path";
export function toPortablePath(path) {
    return path.replaceAll("\\", "/");
}
export function assertPortableRelativePath(path) {
    const portable = toPortablePath(path);
    if (!portable || portable.startsWith("/") || isAbsolute(path) || portable.split("/").some((segment) => segment === ".." || segment === "")) {
        throw new Error(`Ruta relativa no permitida: ${path}`);
    }
    if (/^[a-zA-Z]:/u.test(portable) || portable.includes("\0"))
        throw new Error(`Ruta no portable: ${path}`);
    return portable;
}
export function isContainedPath(root, candidate, caseInsensitive = process.platform === "win32") {
    const rel = relative(resolve(root), resolve(candidate));
    if (rel === "")
        return true;
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
        return false;
    if (!caseInsensitive)
        return true;
    const normalizedRoot = resolve(root).toLocaleLowerCase("en-US");
    const normalizedCandidate = resolve(candidate).toLocaleLowerCase("en-US");
    const relLower = relative(normalizedRoot, normalizedCandidate);
    return relLower !== ".." && !relLower.startsWith(`..${sep}`) && !isAbsolute(relLower);
}
export async function resolveContainedPath(root, candidate) {
    const realRoot = await realpath(root);
    const absoluteCandidate = resolve(realRoot, candidate);
    let resolvedCandidate;
    try {
        resolvedCandidate = await realpath(absoluteCandidate);
    }
    catch {
        resolvedCandidate = absoluteCandidate;
    }
    if (!isContainedPath(realRoot, resolvedCandidate))
        throw new Error(`La ruta sale de la raíz autorizada: ${candidate}`);
    return resolvedCandidate;
}
export function branchKey(branch) {
    const normalized = branch.normalize("NFC").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^[.-]+|[.-]+$/gu, "").slice(0, 64) || "rama";
    const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/iu.test(normalized) ? `rama-${normalized}` : normalized;
    return `${reserved}-${createHash("sha256").update(branch, "utf8").digest("hex").slice(0, 10)}`;
}
//# sourceMappingURL=paths.js.map