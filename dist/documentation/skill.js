import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sha256 } from "../platform/hash.js";
export async function loadArchifySkill(packageRoot, implementation) {
    const path = join(packageRoot, ".github", "skills", "archify-documentation", "SKILL.md");
    try {
        const content = await readFile(path, "utf8");
        if (!content.includes("ASD-TSE-100") || !content.includes("archify.status"))
            throw new Error("La skill no conserva el contrato requerido.");
        return { status: "available", mode: implementation ? "archify" : "fallback", content, sha256: sha256(content), implementation: implementation?.command ?? null, version: implementation?.version ?? null };
    }
    catch (error) {
        if (error.code === "ENOENT")
            return { status: "missing", mode: "fallback", content: null, sha256: null, implementation: null, version: null };
        throw error;
    }
}
//# sourceMappingURL=skill.js.map