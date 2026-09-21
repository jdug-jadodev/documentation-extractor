const SECRET_KEY = /(?:password|passwd|pwd|secret|token|api[_-]?key|client[_-]?secret|private[_-]?key)/iu;
const CONNECTION_CREDENTIALS = /([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]+)@/giu;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/giu;
const AZURE_PAT = /\b[a-z0-9]{52}\b/giu;
export function redactText(input) {
    return input
        .replace(CONNECTION_CREDENTIALS, "$1[REDACTED]@[REDACTED-HOST]/")
        .replace(BEARER, "Bearer [REDACTED]")
        .replace(AZURE_PAT, "[REDACTED]")
        .replace(/(^|[\s,{])(password|passwd|pwd|secret|token|api[_-]?key|client[_-]?secret)\s*[:=]\s*([^\s,;}]+)/gimu, "$1$2=[REDACTED]");
}
export function redactValue(value, key = "") {
    if (SECRET_KEY.test(key))
        return "[REDACTED]";
    if (typeof value === "string")
        return redactText(value);
    if (Array.isArray(value))
        return value.map((item) => redactValue(item));
    if (value !== null && typeof value === "object")
        return Object.fromEntries(Object.entries(value).map(([nestedKey, nested]) => [nestedKey, redactValue(nested, nestedKey)]));
    return value;
}
export function assertNoKnownSecret(text) {
    const dangerous = [BEARER, AZURE_PAT, CONNECTION_CREDENTIALS];
    for (const pattern of dangerous) {
        pattern.lastIndex = 0;
        if (pattern.test(text))
            throw new Error("Se detectó un secreto potencial en una salida exportable.");
    }
}
export function sanitizeDiagnostic(value) {
    return redactText(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "�").slice(0, 4_096);
}
//# sourceMappingURL=redaction.js.map