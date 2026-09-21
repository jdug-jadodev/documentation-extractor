import { PatternExtractorPlugin, method, pathValue } from "../base.js";

export function createDotnetPlugin() {
  return new PatternExtractorPlugin({
    id: "dotnet", version: "1.0.0", languages: ["c_sharp"],
    capabilities: { http_endpoints: "partial", minimal_apis: "implemented", http_clients: "partial", persistence: "partial", manifests: "implemented" },
    rules: [
      { id: "dotnet.controller.route", version: "1", capability: "http_endpoints", languages: ["c_sharp"], file: /\.cs$/iu, pattern: /\[(HttpGet|HttpPost|HttpPut|HttpPatch|HttpDelete)(?:\(\s*(["'][^"']*["'])\s*\))?\]/giu, factKind: "http_endpoint_fragment", map: (match) => ({ framework: "aspnet", method: method(match[1]?.replace(/^Http/iu, "")), path: pathValue(match[2]), route_scope: "method", authentication: "unknown" }) },
      { id: "dotnet.controller.prefix", version: "1", capability: "http_endpoints", languages: ["c_sharp"], file: /\.cs$/iu, pattern: /\[Route\(\s*(["'][^"']+["'])\s*\)\]/giu, factKind: "http_route_prefix", map: (match) => ({ framework: "aspnet", path: pathValue(match[1]), symbolic: /\[[^\]]+\]/u.test(match[1] ?? "") }) },
      { id: "dotnet.minimal.api", version: "1", capability: "minimal_apis", languages: ["c_sharp"], file: /\.cs$/iu, pattern: /\b(?:app|group)\.Map(Get|Post|Put|Patch|Delete)\(\s*(["'][^"']+["'])/giu, factKind: "http_endpoint", map: (match) => ({ framework: "aspnet-minimal", method: method(match[1]), path: pathValue(match[2]), deployment_path: null, authentication: "unknown" }) },
      { id: "dotnet.httpclient.base", version: "1", capability: "http_clients", languages: ["c_sharp"], file: /\.cs$/iu, pattern: /BaseAddress\s*=\s*new\s+Uri\(\s*(["'][^"']+["'])/giu, factKind: "http_client_base", map: (match) => ({ library: "HttpClient", base_url: pathValue(match[1]), resolved: false }) },
      { id: "dotnet.ef.dbset", version: "1", capability: "persistence", languages: ["c_sharp"], file: /\.cs$/iu, pattern: /DbSet<([^>]+)>\s+([A-Za-z_]\w*)/giu, factKind: "data_entity", map: (match) => ({ orm: "entity-framework", entity: match[1]?.trim() ?? null, set: match[2] ?? null, operations: "unknown" }) },
      { id: "dotnet.csproj.package", version: "1", capability: "manifests", languages: ["xml"], file: /\.csproj$/iu, pattern: /<PackageReference\s+Include=["']([^"']+)["'](?:\s+Version=["']([^"']+)["'])?/giu, factKind: "package_dependency", map: (match) => ({ package: match[1] ?? "unknown", declared_version: match[2] ?? null }) }
    ]
  });
}
