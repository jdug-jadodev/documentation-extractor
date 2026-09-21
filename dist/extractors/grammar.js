import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Parser, Language } from "web-tree-sitter";
import { sha256 } from "../platform/hash.js";
export class GrammarManager {
    #root;
    #manifest;
    #initialized = false;
    #languages = new Map();
    constructor(root) { this.#root = root; }
    async verifyAll() {
        const manifest = await this.#loadManifest();
        const results = [];
        for (const record of manifest.grammars) {
            try {
                const bytes = await readFile(join(this.#root, record.file));
                if (sha256(bytes) !== record.sha256)
                    throw new Error("hash SHA-256 no coincide");
                results.push({ language: record.language, ok: true });
            }
            catch (error) {
                results.push({ language: record.language, ok: false, reason: error instanceof Error ? error.message : String(error) });
            }
        }
        return results;
    }
    async parse(language, source) {
        if (!this.#initialized) {
            await Parser.init({ locateFile: () => join(this.#root, "web-tree-sitter.wasm") });
            this.#initialized = true;
        }
        const grammar = await this.#loadLanguage(language);
        const parser = new Parser();
        try {
            parser.setLanguage(grammar);
            const tree = parser.parse(source);
            if (tree === null)
                throw new Error("Tree-sitter no produjo árbol.");
            try {
                return { root: tree.rootNode.type, hasErrors: tree.rootNode.hasError };
            }
            finally {
                tree.delete();
            }
        }
        finally {
            parser.delete();
        }
    }
    async #loadLanguage(language) {
        const cached = this.#languages.get(language);
        if (cached)
            return cached;
        const manifest = await this.#loadManifest();
        const record = manifest.grammars.find((item) => item.language === language);
        if (!record)
            throw new Error(`Gramática no incluida: ${language}`);
        const path = join(this.#root, record.file);
        const bytes = await readFile(path);
        if (sha256(bytes) !== record.sha256)
            throw new Error(`Gramática corrupta: ${language}`);
        const loaded = await Language.load(path);
        this.#languages.set(language, loaded);
        return loaded;
    }
    async #loadManifest() {
        if (this.#manifest)
            return this.#manifest;
        const value = JSON.parse(await readFile(join(this.#root, "manifest.json"), "utf8"));
        if (!isManifest(value))
            throw new Error("Manifiesto de gramáticas inválido.");
        this.#manifest = value;
        return value;
    }
}
function isManifest(value) {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    return record.schema_version === 3 && typeof record.web_tree_sitter === "string" && Array.isArray(record.grammars) && record.grammars.every((item) => item && typeof item === "object" && typeof item.language === "string" && typeof item.file === "string" && /^[0-9a-f]{64}$/u.test(String(item.sha256)));
}
//# sourceMappingURL=grammar.js.map