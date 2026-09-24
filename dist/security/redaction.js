const SECRET_KEY = /(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|account[_-]?key|client[_-]?secret|private[_-]?key|authorization|credential|connection[_-]?string)/iu;
const CONNECTION_CREDENTIALS = /([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]+)@/giu;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/giu;
const BASIC = /\bBasic\s+[A-Za-z0-9+/=]{8,}/giu;
const AZURE_PAT = /\b[a-z0-9]{52}\b/giu;
const AWS_ACCESS_KEY = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu;
const GITHUB_TOKEN = /\bgh[pousr]_[A-Za-z0-9]{20,}\b/gu;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gu;
const PRIVATE_KEY = /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z0-9]+)? PRIVATE KEY-----/gu;
const SECRET_ASSIGNMENT = /(^|[\s,{;])(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|account[_-]?key|client[_-]?secret|private[_-]?key|authorization|credential|connection[_-]?string)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gimu;
export function redactText(input) {
    return input
        .replace(PRIVATE_KEY, "[REDACTED PRIVATE KEY]")
        .replace(CONNECTION_CREDENTIALS, "$1[REDACTED]@[REDACTED-HOST]/")
        .replace(BEARER, "Bearer [REDACTED]")
        .replace(BASIC, "Basic [REDACTED]")
        .replace(JWT, "[REDACTED JWT]")
        .replace(AWS_ACCESS_KEY, "[REDACTED ACCESS KEY]")
        .replace(GITHUB_TOKEN, "[REDACTED TOKEN]")
        .replace(AZURE_PAT, "[REDACTED]")
        .replace(SECRET_ASSIGNMENT, "$1$2=[REDACTED]");
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
    const dangerous = [PRIVATE_KEY, CONNECTION_CREDENTIALS, BEARER, BASIC, JWT, AWS_ACCESS_KEY, GITHUB_TOKEN, AZURE_PAT, SECRET_ASSIGNMENT];
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