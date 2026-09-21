import { createHash } from "node:crypto";

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort(compareBytes).map((key) => [key, sortValue(record[key])]));
  }
  return value;
}

export function contentHash(value: unknown): string {
  return sha256(stableStringify(value));
}

export function compareBytes(left: string, right: string): number {
  return Buffer.from(left, "utf8").compare(Buffer.from(right, "utf8"));
}

export function stableId(prefix: string, ...parts: unknown[]): string {
  return `${prefix}-${contentHash(parts).slice(0, 24)}`;
}
