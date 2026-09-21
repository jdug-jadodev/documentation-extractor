import { XMLParser } from "fast-xml-parser";
import { parse as parseToml } from "smol-toml";
import { parseDocument as parseYaml } from "yaml";
import { parse as parseJsonc } from "jsonc-parser";
import { redactValue } from "../security/redaction.js";
export function parseManifest(text, kind, limits = {}) {
    if (Buffer.byteLength(text, "utf8") > (limits.maxBytes ?? 2 * 1024 * 1024))
        throw new Error("Manifiesto excede el límite de tamaño.");
    let value;
    if (kind === "json")
        value = JSON.parse(text);
    else if (kind === "jsonc") {
        const errors = [];
        value = parseJsonc(text, errors, { allowTrailingComma: true, disallowComments: false });
        if (errors.length > 0)
            throw new Error(`JSONC inválido en byte ${errors[0]?.offset ?? 0}.`);
    }
    else if (kind === "yaml") {
        const document = parseYaml(text, { strict: true });
        if (document.errors.length > 0)
            throw new Error(`YAML inválido: ${document.errors[0]?.message ?? "error"}`);
        value = document.toJS({ maxAliasCount: 20 });
    }
    else if (kind === "toml")
        value = parseToml(text);
    else {
        if (/<!DOCTYPE|<!ENTITY/iu.test(text))
            throw new Error("XML con DTD o entidades externas rechazado.");
        value = new XMLParser({ ignoreAttributes: false, allowBooleanAttributes: false, processEntities: false, htmlEntities: false, stopNodes: [], preserveOrder: false }).parse(text);
    }
    enforceDepth(value, limits.maxDepth ?? 64);
    return redactValue(value);
}
function enforceDepth(value, maxDepth, depth = 0) {
    if (depth > maxDepth)
        throw new Error(`Manifiesto excede profundidad ${maxDepth}.`);
    if (Array.isArray(value))
        for (const item of value)
            enforceDepth(item, maxDepth, depth + 1);
    else if (value !== null && typeof value === "object")
        for (const item of Object.values(value))
            enforceDepth(item, maxDepth, depth + 1);
}
//# sourceMappingURL=manifests.js.map