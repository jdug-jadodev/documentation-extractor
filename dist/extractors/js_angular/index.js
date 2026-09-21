import { PatternExtractorPlugin, method, pathValue } from "../base.js";
export function createAngularPlugin() {
    return new PatternExtractorPlugin({
        id: "js-angular", version: "1.0.0", languages: ["typescript"],
        capabilities: { ui_routes: "partial", http_clients: "partial", components: "implemented", environments: "partial", manifests: "implemented" },
        rules: [
            { id: "angular.route", version: "1", capability: "ui_routes", languages: ["typescript"], file: /\.ts$/iu, pattern: /\{\s*path\s*:\s*(["'][^"']*["'])\s*,\s*(?:component|loadComponent|loadChildren)\s*:/giu, factKind: "ui_route", map: (match) => ({ framework: "angular", path: pathValue(match[1]), backend_endpoint: false }) },
            { id: "angular.httpclient", version: "1", capability: "http_clients", languages: ["typescript"], file: /\.ts$/iu, pattern: /\b(?:this\.)?http\.(get|post|put|patch|delete)\s*(?:<[^>]+>)?\(\s*([`"'][^`"']+[`"'])/giu, factKind: "http_client_call", map: (match) => ({ library: "angular-http-client", method: method(match[1]), path_expression: pathValue(match[2]), target: null }) },
            { id: "angular.component", version: "1", capability: "components", languages: ["typescript"], file: /\.component\.ts$/iu, pattern: /@Component\s*\(\s*\{[\s\S]*?selector\s*:\s*(["'][^"']+["'])/giu, factKind: "ui_component", map: (match) => ({ framework: "angular", selector: pathValue(match[1]) }) },
            { id: "angular.environment", version: "1", capability: "environments", languages: ["typescript"], file: /environment[^/]*\.ts$/iu, pattern: /\b(apiUrl|baseUrl|endpoint)\s*:\s*([`"'][^`"']+[`"'])/giu, factKind: "http_client_base", map: (match) => ({ name: match[1] ?? null, base_url: pathValue(match[2]), resolved: !/\$\{/u.test(match[2] ?? "") }) },
            { id: "angular.package", version: "1", capability: "manifests", languages: ["json"], file: /package\.json$/iu, pattern: /["'](@angular\/[^"']+)["']\s*:\s*["']([^"']+)["']/giu, factKind: "package_dependency", map: (match) => ({ package: match[1] ?? null, declared_version: match[2] ?? null }) }
        ]
    });
}
//# sourceMappingURL=index.js.map