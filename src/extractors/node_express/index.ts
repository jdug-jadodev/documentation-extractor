import { PatternExtractorPlugin, method, pathValue } from "../base.js";

export function createNodeExpressPlugin() {
  return new PatternExtractorPlugin({
    id: "node-express", version: "1.0.0", languages: ["javascript", "typescript"],
    capabilities: { http_endpoints: "partial", route_mounts: "partial", http_clients: "partial", data_access: "partial", manifests: "implemented" },
    rules: [
      { id: "express.route", version: "1", capability: "http_endpoints", languages: ["javascript", "typescript"], file: /\.[cm]?[jt]s$/iu, pattern: /\b(app|router)\s*\.\s*(get|post|put|patch|delete|options|head)\s*\(\s*(["'`][^"'`]+["'`])/giu, factKind: "http_endpoint_fragment", map: (match) => ({ framework: "express", receiver: match[1]?.toLocaleLowerCase("en-US") ?? "unknown", method: method(match[2]), path: pathValue(match[3]), route_scope: match[1]?.toLocaleLowerCase("en-US") === "app" ? "application" : "router" }) },
      { id: "express.mount", version: "1", capability: "route_mounts", languages: ["javascript", "typescript"], file: /\.[cm]?[jt]s$/iu, pattern: /\bapp\s*\.\s*use\s*\(\s*(["'`][^"'`]+["'`])\s*,\s*([A-Za-z_$][\w$]*)/giu, factKind: "http_route_mount", map: (match) => ({ framework: "express", path: pathValue(match[1]), router_symbol: match[2] ?? null }) },
      { id: "node.fetch.static", version: "1", capability: "http_clients", languages: ["javascript", "typescript"], file: /\.[cm]?[jt]s$/iu, pattern: /\bfetch\s*\(\s*(["'`][^"'`]+["'`])(?:\s*,\s*\{[\s\S]{0,300}?method\s*:\s*(["'][A-Z]+["']))?/giu, factKind: "http_client_call", map: (match) => ({ library: "fetch", method: method(match[2] === undefined ? undefined : pathValue(match[2]), "GET"), path_expression: pathValue(match[1]), resolved: !/\$\{/u.test(match[1] ?? ""), target: null }) },
      { id: "node.fetch.symbolic", version: "1", capability: "http_clients", languages: ["javascript", "typescript"], file: /\.[cm]?[jt]s$/iu, pattern: /\bfetch\s*\(\s*([A-Za-z_$][\w$]*)/giu, factKind: "http_client_call", map: (match) => ({ library: "fetch", method: "UNKNOWN", path_expression: match[1] ?? null, resolved: false, target: null }) },
      { id: "supabase.entity", version: "1", capability: "data_access", languages: ["javascript", "typescript"], file: /\.[cm]?[jt]s$/iu, pattern: /\.from\s*\(\s*(["'][^"']+["'])\s*\)/giu, factKind: "data_entity", map: (match) => ({ provider: "supabase", entity: pathValue(match[1]) }) },
      { id: "supabase.read", version: "1", capability: "data_access", languages: ["javascript", "typescript"], file: /\.[cm]?[jt]s$/iu, pattern: /\.from\s*\(\s*(["'][^"']+["'])\s*\)[\s\S]{0,500}?\.select\s*\(/giu, factKind: "data_read", map: (match) => ({ provider: "supabase", resource: pathValue(match[1]), operation: "select" }) },
      { id: "supabase.write", version: "1", capability: "data_access", languages: ["javascript", "typescript"], file: /\.[cm]?[jt]s$/iu, pattern: /\.from\s*\(\s*(["'][^"']+["'])\s*\)[\s\S]{0,500}?\.(insert|update|upsert|delete)\s*\(/giu, factKind: "data_write", map: (match) => ({ provider: "supabase", resource: pathValue(match[1]), operation: match[2]?.toLocaleLowerCase("en-US") ?? "unknown" }) },
      { id: "express.package", version: "1", capability: "manifests", languages: ["json"], file: /package\.json$/iu, pattern: /["'](express|@supabase\/supabase-js)["']\s*:\s*["']([^"']+)["']/giu, factKind: "package_dependency", map: (match) => ({ package: match[1] ?? null, declared_version: match[2] ?? null }) },
    ],
  });
}
