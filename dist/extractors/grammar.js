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
                const root = tree.rootNode;
                return { root: root.type, hasErrors: tree.rootNode.hasError, analysis: analyzeTree(root, source, language) };
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
function analyzeTree(root, source, language) {
    const symbols = [];
    const constructions = [];
    const injections = [];
    const java = language === "java";
    const visit = (node, ownerClass, ownerSymbol) => {
        const classKind = classType(node.type);
        if (classKind !== null) {
            const name = fieldText(node, "name") || declaredName(node.text) || "anonymous";
            symbols.push(symbolFromNode(node, name, classKind, null, source, language));
            for (const child of node.namedChildren)
                visit(child, name, null);
            return;
        }
        if (isMethodNode(node, java)) {
            const name = node.type === "constructor_declaration" ? ownerClass ?? "constructor" : fieldText(node, "name") || methodName(node.text);
            const kind = node.type === "constructor_declaration" || name === "constructor" ? "constructor" : "method";
            const symbol = symbolFromNode(node, name, kind, ownerClass, source, language);
            symbols.push(symbol);
            if (kind === "constructor" && ownerClass !== null)
                for (const parameter of symbol.parameters)
                    injections.push({ class_name: ownerClass, parameter: parameter.name, dependency_type: parameter.type, start: node.startIndex, end: node.endIndex });
            collectConstructions(node, ownerClass, name, constructions);
            return;
        }
        if (!java && node.type === "variable_declarator") {
            const value = node.childForFieldName("value");
            if (value !== null && ["arrow_function", "function_expression", "generator_function"].includes(value.type)) {
                const name = fieldText(node, "name") || "anonymous";
                symbols.push(symbolFromNode(node, name, ownerClass === null ? "function" : "method", ownerClass, source, language, value));
                collectConstructions(value, ownerClass, name, constructions);
                return;
            }
        }
        if (!java && ["public_field_definition", "property_definition"].includes(node.type)) {
            const value = node.childForFieldName("value") ?? node.namedChildren.find((child) => child.type === "arrow_function" || child.type === "function_expression") ?? null;
            if (value !== null && ["arrow_function", "function_expression"].includes(value.type)) {
                const name = fieldText(node, "name") || node.namedChildren[0]?.text || "anonymous";
                symbols.push(symbolFromNode(node, name, "method", ownerClass, source, language, value));
                collectConstructions(value, ownerClass, name, constructions);
                return;
            }
        }
        if ((!java && ["function_declaration", "generator_function_declaration"].includes(node.type)) || (java && node.type === "method_declaration" && ownerClass === null)) {
            const name = fieldText(node, "name") || methodName(node.text);
            symbols.push(symbolFromNode(node, name, ownerClass === null ? "function" : "method", ownerClass, source, language));
            collectConstructions(node, ownerClass, name, constructions);
            return;
        }
        if (isConstructionNode(node))
            constructions.push(constructionFromNode(node, ownerClass, ownerSymbol));
        for (const child of node.namedChildren)
            visit(child, ownerClass, ownerSymbol);
    };
    visit(root, null, null);
    return { symbols: uniqueBy(symbols, (item) => `${item.symbol_type}\0${item.class_name ?? ""}\0${item.name}\0${item.start}`), constructions: uniqueBy(constructions, (item) => `${item.constructed_type}\0${item.variable ?? ""}\0${item.start}`), injections: uniqueBy(injections, (item) => `${item.class_name}\0${item.parameter}\0${item.start}`) };
}
function classType(type) {
    if (["class_declaration", "abstract_class_declaration"].includes(type))
        return "class";
    if (type === "interface_declaration")
        return "interface";
    if (type === "enum_declaration")
        return "enum";
    if (type === "record_declaration")
        return "record";
    return null;
}
function isMethodNode(node, java) {
    return java ? ["method_declaration", "constructor_declaration"].includes(node.type) : ["method_definition", "abstract_method_signature", "method_signature"].includes(node.type);
}
function symbolFromNode(node, name, kind, className, source, language, callable = node) {
    const header = source.slice(node.startIndex, Math.min(node.endIndex, bodyStart(node))).replace(/\s+/gu, " ").trim();
    const text = source.slice(node.startIndex, node.endIndex);
    return {
        name,
        symbol_type: kind,
        class_name: className,
        exported: /\bexport\b/u.test(header) || /\bpublic\b/u.test(header),
        visibility: /\b(private|protected|public)\b/u.exec(header)?.[1] ?? "default",
        static: /\bstatic\b/u.test(header),
        async: /\basync\b/u.test(header),
        parameters: parseParameters(callable.childForFieldName("parameters")?.text ?? callable.childForFieldName("formal_parameters")?.text ?? parameterText(header), language),
        signature: compact(header || text),
        calls: ["class", "interface", "enum", "record"].includes(kind) ? [] : collectCalls(callable),
        start: node.startIndex,
        end: node.endIndex,
        start_line: node.startPosition.row + 1,
        end_line: node.endPosition.row + 1,
        snippet: excerpt(text)
    };
}
function collectCalls(root) {
    const result = [];
    const visit = (node, initial) => {
        if (!initial && (classType(node.type) !== null || isCallableBoundary(node.type)))
            return;
        if (node.type === "call_expression") {
            const expression = node.childForFieldName("function")?.text ?? node.namedChildren[0]?.text ?? "";
            result.push(callFromExpression(expression, node));
        }
        else if (node.type === "method_invocation") {
            const name = fieldText(node, "name") || methodName(node.text);
            const receiver = fieldText(node, "object") || null;
            result.push({ name, receiver, expression: receiver === null ? name : `${receiver}.${name}`, start: node.startIndex, end: node.endIndex });
        }
        for (const child of node.namedChildren)
            visit(child, false);
    };
    visit(root, true);
    return uniqueBy(result.filter((item) => item.name !== ""), (item) => `${item.expression}\0${item.start}`);
}
function callFromExpression(expression, node) {
    const cleaned = expression.replace(/\?\./gu, ".").trim();
    const parts = cleaned.split(".");
    return { name: parts.at(-1) ?? cleaned, receiver: parts.length > 1 ? parts.slice(0, -1).join(".") : null, expression: cleaned, start: node.startIndex, end: node.endIndex };
}
function collectConstructions(root, ownerClass, ownerSymbol, target) {
    const visit = (node, initial) => {
        if (!initial && (classType(node.type) !== null || isCallableBoundary(node.type)))
            return;
        if (isConstructionNode(node))
            target.push(constructionFromNode(node, ownerClass, ownerSymbol));
        for (const child of node.namedChildren)
            visit(child, false);
    };
    visit(root, true);
}
function constructionFromNode(node, ownerClass, ownerSymbol) {
    const type = fieldText(node, "constructor") || fieldText(node, "type") || /\bnew\s+([\w$.]+)/u.exec(node.text)?.[1] || "unknown";
    const args = node.childForFieldName("arguments")?.namedChildren.map((child) => child.text.trim()) ?? [];
    return { variable: assignedVariable(node), constructed_type: type, arguments: args, owner_class: ownerClass, owner_symbol: ownerSymbol, start: node.startIndex, end: node.endIndex };
}
function assignedVariable(node) {
    let parent = node.parent;
    for (let depth = 0; parent !== null && depth < 3; depth += 1, parent = parent.parent) {
        if (parent.type === "variable_declarator")
            return fieldText(parent, "name") || null;
        if (["assignment_expression", "assignment_expression_statement"].includes(parent.type))
            return fieldText(parent, "left") || parent.namedChildren[0]?.text || null;
    }
    return null;
}
function parseParameters(raw, language) {
    const value = raw.replace(/^\(|\)$/gu, "").trim();
    if (value === "")
        return [];
    return splitParameters(value).map((parameter) => {
        const clean = parameter.replace(/@[A-Za-z_$][\w$]*(?:\([^)]*\))?/gu, "").replace(/\b(final|private|public|protected|readonly)\b/gu, "").trim();
        if (language === "java") {
            const match = /([A-Za-z_$][\w$<>, ?.[\]]*)\s+([A-Za-z_$][\w$]*)$/u.exec(clean);
            return { name: match?.[2] ?? clean, type: match?.[1]?.trim() ?? null };
        }
        const match = /(?:\.\.\.)?([A-Za-z_$][\w$]*)\??\s*(?::\s*([^=]+))?/u.exec(clean);
        return { name: match?.[1] ?? clean, type: match?.[2]?.trim() ?? null };
    }).filter((item) => item.name !== "");
}
function splitParameters(value) {
    const result = [];
    let current = "";
    let depth = 0;
    for (const char of value) {
        if ("(<[{".includes(char))
            depth += 1;
        else if (")>]}".includes(char))
            depth -= 1;
        if (char === "," && depth === 0) {
            result.push(current.trim());
            current = "";
        }
        else
            current += char;
    }
    if (current.trim() !== "")
        result.push(current.trim());
    return result;
}
function fieldText(node, field) { return node.childForFieldName(field)?.text.trim() ?? ""; }
function declaredName(text) { return /\b(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/u.exec(text)?.[1] ?? null; }
function methodName(text) { return /([A-Za-z_$][\w$]*)\s*\(/u.exec(text)?.[1] ?? "anonymous"; }
function parameterText(header) { return /\(([^)]*)\)/u.exec(header)?.[1] ?? ""; }
function bodyStart(node) { const body = node.childForFieldName("body"); if (body !== null)
    return body.startIndex; const relative = node.text.indexOf("{"); return relative >= 0 ? node.startIndex + relative : node.endIndex; }
function isCallableBoundary(type) { return ["function_declaration", "generator_function_declaration", "method_definition", "method_declaration", "constructor_declaration", "arrow_function", "function_expression"].includes(type); }
function isConstructionNode(node) { return node.type === "new_expression" || node.type === "object_creation_expression"; }
function compact(value) { return value.replace(/\s+/gu, " ").trim().slice(0, 500); }
function excerpt(value) { const lines = value.split(/\r?\n/u); return lines.slice(0, 14).join("\n").slice(0, 1600); }
function uniqueBy(values, key) { return [...new Map(values.map((value) => [key(value), value])).values()]; }
function isManifest(value) {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    return record.schema_version === 3 && typeof record.web_tree_sitter === "string" && Array.isArray(record.grammars) && record.grammars.every((item) => item && typeof item === "object" && typeof item.language === "string" && typeof item.file === "string" && /^[0-9a-f]{64}$/u.test(String(item.sha256)));
}
//# sourceMappingURL=grammar.js.map