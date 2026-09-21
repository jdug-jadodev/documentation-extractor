import { PatternExtractorPlugin, method, pathValue } from "../base.js";

export function createJavaWeblogicPlugin() {
  return new PatternExtractorPlugin({
    id: "java-weblogic", version: "1.0.0", languages: ["java", "xml"],
    capabilities: { jax_rs: "partial", ejb: "partial", jms: "partial", jndi: "implemented", deployment_descriptors: "implemented" },
    rules: [
      { id: "jee.jaxrs.path", version: "1", capability: "jax_rs", languages: ["java"], file: /\.java$/iu, pattern: /@(GET|POST|PUT|PATCH|DELETE)\b[\s\S]{0,300}?@Path\(\s*(["'][^"']+["'])\s*\)/giu, factKind: "http_endpoint_fragment", map: (match) => ({ framework: "jax-rs", method: method(match[1]), path: pathValue(match[2]), route_scope: "unknown" }) },
      { id: "jee.ejb", version: "1", capability: "ejb", languages: ["java"], file: /\.java$/iu, pattern: /@(Stateless|Stateful|Singleton)\b[\s\S]{0,200}?class\s+([A-Za-z_]\w*)/giu, factKind: "jee_component", map: (match) => ({ type: match[1]?.toLocaleLowerCase("en-US") ?? null, name: match[2] ?? null }) },
      { id: "jee.jms.destination", version: "1", capability: "jms", languages: ["java", "xml"], file: /\.(?:java|xml)$/iu, pattern: /(?:destinationLookup\s*=\s*["']|<destination-jndi-name>)([^"'<]+)(?:["']|<\/destination-jndi-name>)/giu, factKind: "message_resource", map: (match) => ({ broker: "jms", destination: match[1]?.trim() ?? null, environment: null }) },
      { id: "jee.jndi", version: "1", capability: "jndi", languages: ["java", "xml"], file: /\.(?:java|xml)$/iu, pattern: /(?:lookup\s*=\s*["']|<jndi-name>)([^"'<]+)(?:["']|<\/jndi-name>)/giu, factKind: "jndi_resource", map: (match) => ({ name: match[1]?.trim() ?? null, resolved: false }) },
      { id: "jee.module", version: "1", capability: "deployment_descriptors", languages: ["xml"], file: /(?:application|web|weblogic)\.xml$/iu, pattern: /<(web-uri|ejb|context-root)>([^<]+)<\/(?:web-uri|ejb|context-root)>/giu, factKind: "deployment_module", map: (match) => ({ kind: match[1] ?? null, value: match[2]?.trim() ?? null, declared: true }) }
    ]
  });
}
