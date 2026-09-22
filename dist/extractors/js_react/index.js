import { PatternExtractorPlugin, method, pathValue } from "../base.js";
export function createReactPlugin() {
    return new PatternExtractorPlugin({
        id: "js-react", version: "1.0.0", languages: ["javascript", "typescript", "tsx"],
        capabilities: { ui_routes: "partial", http_clients: "partial", components: "partial", ssr: "unsupported", manifests: "implemented" },
        rules: [
            { id: "react.router.route", version: "1", capability: "ui_routes", languages: ["javascript", "typescript", "tsx"], file: /\.[jt]sx?$/iu, pattern: /<Route\b[^>]*\bpath\s*=\s*(?:\{)?(["'][^"']+["'])/giu, factKind: "ui_route", map: (match) => ({ framework: "react-router", path: pathValue(match[1]), backend_endpoint: false }) },
            { id: "react.fetch", version: "1", capability: "http_clients", languages: ["javascript", "typescript", "tsx"], file: /\.[jt]sx?$/iu, pattern: /\bfetch\(\s*([`"'][^`"']+[`"'])(?:\s*,\s*\{[\s\S]{0,300}?method\s*:\s*(["'][A-Z]+["']))?/giu, factKind: "http_client_call", map: (match) => ({ library: "fetch", method: method(match[2] === undefined ? undefined : pathValue(match[2]), "GET"), path_expression: pathValue(match[1]), target: null }) },
            { id: "react.axios", version: "1", capability: "http_clients", languages: ["javascript", "typescript", "tsx"], file: /\.[jt]sx?$/iu, pattern: /\baxios\.(get|post|put|patch|delete)\(\s*([`"'][^`"']+[`"'])/giu, factKind: "http_client_call", map: (match) => ({ library: "axios", method: method(match[1]), path_expression: pathValue(match[2]), target: null }) },
            { id: "react.component", version: "1", capability: "components", languages: ["javascript", "typescript", "tsx"], file: /\.[jt]sx$/iu, pattern: /(?:function|const)\s+([A-Z][A-Za-z0-9_]*)\s*(?:\([^)]*\)|=)[\s\S]{0,200}?(?:return\s*\(|=>\s*\(?\s*<)/giu, factKind: "ui_component", map: (match) => ({ framework: "react", name: match[1] ?? null }) }
        ]
    });
}
//# sourceMappingURL=index.js.map