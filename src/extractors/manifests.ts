import { XMLParser } from "fast-xml-parser";
import { parse as parseToml } from "smol-toml";
import { parseDocument as parseYaml } from "yaml";
import { parse as parseJsonc, type ParseError } from "jsonc-parser";
import { redactValue } from "../security/redaction.js";

export type ManifestKind = "json" | "jsonc" | "yaml" | "xml" | "toml";

export function parseManifest(text: string, kind: ManifestKind, limits: { maxBytes?: number; maxDepth?: number } = {}): unknown {
  if (Buffer.byteLength(text, "utf8") > (limits.maxBytes ?? 2 * 1024 * 1024)) throw new Error("Manifiesto excede el límite de tamaño.");
  let value: unknown;
  if (kind === "json") value = JSON.parse(text) as unknown;
  else if (kind === "jsonc") {
    const errors: ParseError[] = []; value = parseJsonc(text, errors, { allowTrailingComma: true, disallowComments: false });
    if (errors.length > 0) throw new Error(`JSONC inválido en byte ${errors[0]?.offset ?? 0}.`);
  } else if (kind === "yaml") {
    const document = parseYaml(text, { strict: true });
    if (document.errors.length > 0) throw new Error(`YAML inválido: ${document.errors[0]?.message ?? "error"}`);
    value = document.toJS({ maxAliasCount: 20 });
  } else if (kind === "toml") value = parseToml(text);
  else {
    if (/<!DOCTYPE|<!ENTITY/iu.test(text)) throw new Error("XML con DTD o entidades externas rechazado.");
    value = new XMLParser({ ignoreAttributes: false, allowBooleanAttributes: false, processEntities: false, htmlEntities: false, stopNodes: [], preserveOrder: false }).parse(text) as unknown;
  }
  enforceDepth(value, limits.maxDepth ?? 64);
  return redactValue(value);
}

function enforceDepth(value: unknown, maxDepth: number, depth = 0): void {
  if (depth > maxDepth) throw new Error(`Manifiesto excede profundidad ${maxDepth}.`);
  if (Array.isArray(value)) for (const item of value) enforceDepth(item, maxDepth, depth + 1);
  else if (value !== null && typeof value === "object") for (const item of Object.values(value as Record<string, unknown>)) enforceDepth(item, maxDepth, depth + 1);
}
