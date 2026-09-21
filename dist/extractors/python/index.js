import { PatternExtractorPlugin, method, pathValue } from "../base.js";
export function createPythonPlugin() {
    return new PatternExtractorPlugin({
        id: "python", version: "1.0.0", languages: ["python"],
        capabilities: { http_endpoints: "implemented", http_clients: "partial", manifests: "implemented", django_routes: "partial" },
        rules: [
            { id: "python.fastapi.decorator", version: "1", capability: "http_endpoints", languages: ["python"], file: /\.py$/iu, pattern: /@(?:app|router)\.(get|post|put|patch|delete|options|head)\(\s*([rubf]*["'][^"']+["'])/giu, factKind: "http_endpoint", map: (match) => ({ framework: "fastapi", method: method(match[1]), path: pathValue(match[2]?.replace(/^[rubf]+/iu, "")), deployment_path: null, authentication: "unknown" }) },
            { id: "python.flask.route", version: "1", capability: "http_endpoints", languages: ["python"], file: /\.py$/iu, pattern: /@(?:app|blueprint|bp)\.route\(\s*([rubf]*["'][^"']+["'])(?:\s*,\s*methods\s*=\s*\[([^\]]+)\])?/giu, factKind: "http_endpoint", map: (match) => ({ framework: "flask", method: match[2] ? match[2].replace(/["'\s]/gu, "").split(",").map((item) => method(item)) : ["GET"], path: pathValue(match[1]?.replace(/^[rubf]+/iu, "")), deployment_path: null, authentication: "unknown" }) },
            { id: "python.django.path", version: "1", capability: "django_routes", languages: ["python"], file: /urls\.py$/iu, pattern: /\b(?:path|re_path)\(\s*([rubf]*["'][^"']+["'])\s*,\s*([A-Za-z_][\w.]*)/giu, factKind: "ui_or_http_route", map: (match) => ({ framework: "django", path: `/${pathValue(match[1]?.replace(/^[rubf]+/iu, ""))}`.replace(/\/+/gu, "/"), handler: match[2] ?? null, method: "unknown" }) },
            { id: "python.httpx.base_url", version: "1", capability: "http_clients", languages: ["python"], file: /\.py$/iu, pattern: /httpx\.(?:Client|AsyncClient)\([^)]*?base_url\s*=\s*(["'][^"']+["'])/giu, factKind: "http_client_base", map: (match) => ({ library: "httpx", base_url: pathValue(match[1]), resolved: false }) },
            { id: "python.http.client_call", version: "1", capability: "http_clients", languages: ["python"], file: /\.py$/iu, pattern: /\b([A-Za-z_]\w*)\.(get|post|put|patch|delete)\(\s*([furb]*["'][^"']+["'])/giu, factKind: "http_client_call", map: (match) => ({ client: match[1] ?? null, method: method(match[2]), path_expression: pathValue(match[3]?.replace(/^[furb]+/iu, "")), target: null }) },
            { id: "python.manifest.dependency", version: "1", capability: "manifests", languages: ["python"], file: /(?:requirements[^/]*\.txt|pyproject\.toml)$/iu, pattern: /^\s*([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?\s*(?:[=<>~!^].*)?$/gimu, factKind: "package_dependency", map: (match) => ({ package: match[1] ?? "unknown", declared: true, resolved_version: null }) }
        ]
    });
}
//# sourceMappingURL=index.js.map