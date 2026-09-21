import { PatternExtractorPlugin, method, pathValue } from "../base.js";
export function createJavaSpringPlugin() {
    return new PatternExtractorPlugin({
        id: "java-spring", version: "1.0.0", languages: ["java"],
        capabilities: { http_endpoints: "partial", feign_clients: "partial", persistence: "partial", messaging: "partial", manifests: "implemented" },
        rules: [
            { id: "spring.mapping.method", version: "1", capability: "http_endpoints", languages: ["java"], file: /\.java$/iu, pattern: /@(Get|Post|Put|Patch|Delete)Mapping\s*\(\s*(?:value\s*=\s*|path\s*=\s*)?(["'][^"']*["'])/giu, factKind: "http_endpoint_fragment", map: (match) => ({ framework: "spring", method: method(match[1]), path: pathValue(match[2]), route_scope: "method", reactive: "unknown" }) },
            { id: "spring.request.mapping", version: "1", capability: "http_endpoints", languages: ["java"], file: /\.java$/iu, pattern: /@RequestMapping\s*\(\s*(?:value\s*=\s*|path\s*=\s*)?(["'][^"']*["'])(?:[^)]*?method\s*=\s*RequestMethod\.([A-Z]+))?/giu, factKind: "http_endpoint_fragment", map: (match) => ({ framework: "spring", method: method(match[2]), path: pathValue(match[1]), route_scope: "unknown", reactive: "unknown" }) },
            { id: "spring.feign.client", version: "1", capability: "feign_clients", languages: ["java"], file: /\.java$/iu, pattern: /@FeignClient\s*\([^)]*?(?:url\s*=\s*)?(["'][^"']+["'])/giu, factKind: "http_client_base", map: (match) => ({ library: "feign", base_url: pathValue(match[1]), resolved: !/\$\{/u.test(match[1] ?? "") }) },
            { id: "spring.jpa.entity", version: "1", capability: "persistence", languages: ["java"], file: /\.java$/iu, pattern: /@Entity\b[\s\S]{0,500}?\bclass\s+([A-Za-z_]\w*)/giu, factKind: "data_entity", map: (match) => ({ orm: "jpa", entity: match[1] ?? null, operations: "unknown" }) },
            { id: "spring.kafka.listener", version: "1", capability: "messaging", languages: ["java"], file: /\.java$/iu, pattern: /@KafkaListener\s*\([^)]*?topics\s*=\s*(["'][^"']+["'])/giu, factKind: "message_consumer", map: (match) => ({ broker: "kafka", topic: pathValue(match[1]), environment: null }) },
            { id: "spring.pom.dependency", version: "1", capability: "manifests", languages: ["xml"], file: /pom\.xml$/iu, pattern: /<dependency>[\s\S]*?<groupId>([^<]+)<\/groupId>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?<\/dependency>/giu, factKind: "package_dependency", map: (match) => ({ package: `${match[1]?.trim() ?? "unknown"}:${match[2]?.trim() ?? "unknown"}`, declared: true }) }
        ]
    });
}
//# sourceMappingURL=index.js.map