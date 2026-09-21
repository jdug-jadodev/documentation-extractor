import { createHash } from "node:crypto";
export function sha256(value) {
    return createHash("sha256").update(value).digest("hex");
}
export function stableStringify(value) {
    return JSON.stringify(sortValue(value));
}
function sortValue(value) {
    if (Array.isArray(value))
        return value.map(sortValue);
    if (value !== null && typeof value === "object") {
        const record = value;
        return Object.fromEntries(Object.keys(record).sort(compareBytes).map((key) => [key, sortValue(record[key])]));
    }
    return value;
}
export function contentHash(value) {
    return sha256(stableStringify(value));
}
export function compareBytes(left, right) {
    return Buffer.from(left, "utf8").compare(Buffer.from(right, "utf8"));
}
export function stableId(prefix, ...parts) {
    return `${prefix}-${contentHash(parts).slice(0, 24)}`;
}
//# sourceMappingURL=hash.js.map