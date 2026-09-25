import { mkdir, readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { atomicWrite } from "../platform/fs.js";
import { sha256, stableId } from "../platform/hash.js";
import { productionFacts } from "../documentation/source_scope.js";
const INDEX_VERSION = 6;
export async function buildDocumentationIntelligence(input) {
    const startedAt = performance.now(), initialHeap = process.memoryUsage().heapUsed;
    const root = join(input.runRoot, "documentation-intelligence");
    await mkdir(root, { recursive: true });
    const previousManifest = await readJson(join(root, "manifest.json")).catch(() => null);
    const previous = previousManifest?.index_version === INDEX_VERSION ? await loadChunks(root) : [];
    const previousByIdentity = new Map(previous.map((chunk) => [`${chunk.document_path}\0${chunk.section_type}\0${chunk.heading ?? ""}\0${chunk.sha256}`, chunk]));
    const files = (await listFiles(input.vaultRoot)).filter((path) => extname(path).toLocaleLowerCase("en-US") === ".md").sort();
    const snapshotByRepository = new Map(input.snapshots.map((snapshot) => [snapshot.repository_id, snapshot]));
    const chunks = [];
    const documents = [];
    let reusedChunks = 0;
    for (const absolute of files) {
        const documentPath = relative(input.vaultRoot, absolute).replaceAll("\\", "/");
        const content = await readFile(absolute, "utf8");
        const identity = documentIdentity(documentPath, snapshotByRepository);
        const documentChunks = splitMarkdown(content).map((section, index) => {
            const hash = sha256(section.content);
            const sectionType = classifySection(identity.documentType, section.heading);
            const prior = previousByIdentity.get(`${documentPath}\0${sectionType}\0${section.heading ?? ""}\0${hash}`);
            if (prior !== undefined) {
                reusedChunks++;
                return prior;
            }
            return createChunk({ runId: input.runId, documentPath, documentType: identity.documentType, repositoryId: identity.repositoryId, ref: identity.ref, commit: identity.commit, heading: section.heading, sectionType, content: section.content, index, hash });
        });
        chunks.push(...documentChunks);
        documents.push({ path: documentPath, sha256: sha256(content), chunks: documentChunks.map((chunk) => chunk.id) });
    }
    const facts = productionFacts(input.facts);
    const links = buildLinks(chunks, facts, input.graph);
    const capabilities = buildCapabilities(input.runId, chunks, links, facts, input.overrides);
    const manifest = { schema_version: 3, index_version: INDEX_VERSION, run_id: input.runId, generated_at: new Date().toISOString(), documents, chunks: chunks.length, reused_chunks: reusedChunks, metrics: { duration_ms: Math.round(performance.now() - startedAt), heap_delta_bytes: process.memoryUsage().heapUsed - initialHeap, link_count: links.length }, repositories: input.snapshots.map((snapshot) => ({ id: snapshot.repository_id, ref: snapshot.requested_ref, commit: snapshot.commit_oid })) };
    await Promise.all([
        atomicWrite(join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`),
        atomicWrite(join(root, "chunks.jsonl"), `${chunks.map((chunk) => JSON.stringify(chunk)).join("\n")}\n`),
        atomicWrite(join(root, "lexical-index.json"), `${JSON.stringify(lexicalIndex(chunks))}\n`),
        atomicWrite(join(root, "endpoint-index.json"), `${JSON.stringify(groupIndex(chunks, (chunk) => chunk.endpoint === null ? [] : [`${chunk.endpoint.method} ${chunk.endpoint.path}`, chunk.endpoint.path]))}\n`),
        atomicWrite(join(root, "symbol-index.json"), `${JSON.stringify(groupIndex(chunks, (chunk) => chunk.symbols))}\n`),
        atomicWrite(join(root, "source-path-index.json"), `${JSON.stringify(groupIndex(chunks, (chunk) => chunk.source_paths))}\n`),
        atomicWrite(join(root, "evidence-index.json"), `${JSON.stringify(groupIndex(chunks, (chunk) => chunk.evidence_ids))}\n`),
        atomicWrite(join(root, "link-graph.json"), `${JSON.stringify({ schema_version: 3, nodes: chunks.map((chunk) => ({ id: chunk.id, document_path: chunk.document_path, section_type: chunk.section_type })), edges: links }, null, 2)}\n`),
        atomicWrite(join(root, "capability-index.json"), `${JSON.stringify({ schema_version: 3, capabilities }, null, 2)}\n`),
    ]);
    return { root, manifest, chunks, links, capabilities };
}
export async function loadDocumentationIntelligence(runRoot) {
    const root = join(runRoot, "documentation-intelligence");
    const [manifest, chunks, graph, capabilityIndex] = await Promise.all([
        readJson(join(root, "manifest.json")), loadChunks(root),
        readJson(join(root, "link-graph.json")), readJson(join(root, "capability-index.json")),
    ]);
    return { root, manifest, chunks, links: graph.edges, capabilities: capabilityIndex.capabilities };
}
async function listFiles(root) {
    const result = [];
    for (const entry of await readdir(root, { withFileTypes: true })) {
        const path = join(root, entry.name);
        if (entry.isDirectory())
            result.push(...await listFiles(path));
        else if (entry.isFile())
            result.push(path);
    }
    return result;
}
function splitMarkdown(content) {
    const lines = content.split(/\r?\n/u), sections = [];
    let current = { heading: null, lines: [] };
    for (const line of lines) {
        const heading = /^(#{1,6})\s+(.+)$/u.exec(line);
        if (heading && current.lines.length > 0) {
            sections.push(current);
            current = { heading: heading[2] ?? null, lines: [line] };
        }
        else {
            if (heading)
                current.heading = heading[2] ?? null;
            current.lines.push(line);
        }
    }
    if (current.lines.some((line) => line.trim() !== ""))
        sections.push(current);
    return sections.flatMap((section) => splitLargeSection(section.heading, section.lines.join("\n").trim()));
}
function splitLargeSection(heading, content) {
    if (Buffer.byteLength(content) <= 48_000)
        return [{ heading, content }];
    const paragraphs = content.split(/\n{2,}/u), result = [];
    let current = "", part = 1;
    for (const paragraph of paragraphs) {
        if (current !== "" && Buffer.byteLength(`${current}\n\n${paragraph}`) > 48_000) {
            result.push({ heading: `${heading ?? "Documento"} · parte ${part++}`, content: current });
            current = paragraph;
        }
        else
            current = current === "" ? paragraph : `${current}\n\n${paragraph}`;
    }
    if (current !== "")
        result.push({ heading: part === 1 ? heading : `${heading ?? "Documento"} · parte ${part}`, content: current });
    return result;
}
function documentIdentity(path, snapshots) {
    const match = /^Servicios\/([^/]+)\/([^/]+)\/(.+)$/u.exec(path);
    const repositoryId = match?.[1] ?? "_workspace", snapshot = snapshots.get(repositoryId);
    const file = match?.[3] ?? path;
    const documentType = file === "servicio.md" ? "service" : file.startsWith("flujos/") ? "flow" : file.startsWith("clases/") ? "class" : file.startsWith("metodos/") ? "method" : file.startsWith("diagramas/") ? `diagram:${file.slice(10, -3)}` : path.startsWith("Mapas/") ? "map" : "document";
    return { repositoryId, ref: snapshot?.requested_ref ?? match?.[2] ?? "workspace", commit: snapshot?.commit_oid ?? "workspace", documentType };
}
function classifySection(documentType, heading) {
    const text = normalize(heading ?? "summary");
    const mappings = [[/arquitect/u, "architecture"], [/contrat|endpoint|router/u, "contracts"], [/dato|persist/u, "data"], [/segur/u, "security"], [/riesg|limit/u, "risks"], [/naveg|clase|metodo/u, "navigation"], [/diagrama/u, "diagram"], [/paso|flujo/u, "steps"], [/integr/u, "integrations"], [/fragment/u, "snippet"], [/firma/u, "signature"], [/llamadas realizadas/u, "calls"], [/llamado por/u, "callers"], [/modulo/u, "modules"], [/capa/u, "layers"], [/estructura|arbol/u, "structure"]];
    const suffix = mappings.find(([pattern]) => pattern.test(text))?.[1] ?? "summary";
    return `${documentType}:${suffix}`;
}
function createChunk(input) {
    const endpointMatch = /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|UI)\s+(\/[^\s`|"\]]*)/u.exec(input.content);
    const sourcePaths = unique([...input.content.matchAll(/`([^`\n]+\.(?:java|kt|ts|tsx|js|jsx|py|cs|xml|ya?ml|json))(?::\d+)?`/giu)].map((match) => match[1].replace(/:\d+$/u, "")));
    const headingSymbol = (/^(?:class|interface|record|enum|método|constructor|función)\s+(.+)$/iu.exec(input.heading ?? "")?.[1] ?? /^([A-Z][A-Za-z0-9_$]*\.[A-Za-z_$][\w$]*)$/u.exec(input.heading ?? "")?.[1])?.trim();
    const symbols = unique([...(headingSymbol === undefined ? [] : [headingSymbol]), ...[...input.content.matchAll(/`([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)`/gu)].map((match) => match[1]).filter((value) => !value.includes("/")), ...[...input.content.matchAll(/\b([A-Z][A-Za-z0-9_$]*\.[A-Za-z_$][\w$]*)\b/gu)].map((match) => match[1])]).slice(0, 100);
    const outgoingLinks = unique([...input.content.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/gu)].map((match) => match[1]));
    const evidenceIds = unique([...input.content.matchAll(/\b(?:evidence|ev)-[A-Za-z0-9._-]+\b/gu)].map((match) => match[0]));
    const confidenceStates = ["supported", "candidate", "unresolved"].filter((state) => new RegExp(`\\b${state}\\b`, "iu").test(input.content));
    return { id: stableId("chunk", input.runId, input.documentPath, input.sectionType, input.heading, input.index, input.hash), run_id: input.runId, repository_id: input.repositoryId, ref: input.ref, commit: input.commit, document_path: input.documentPath, document_type: input.documentType, section_type: input.sectionType, heading: input.heading, endpoint: endpointMatch ? { method: endpointMatch[1], path: endpointMatch[2] } : null, symbols, source_paths: sourcePaths, layers: matchedValues(input.content, ["application", "domain", "infrastructure", "api", "root"]), roles: matchedValues(input.content, ["router", "handler", "controller", "mapper", "service", "repository", "entity", "port", "adapter"]), evidence_ids: evidenceIds, confidence_states: confidenceStates, outgoing_links: outgoingLinks, content: input.content, sha256: input.hash };
}
function buildLinks(chunks, facts, graph) {
    const links = [], byDocument = new Map();
    for (const chunk of chunks)
        byDocument.set(chunk.document_path, [...(byDocument.get(chunk.document_path) ?? []), chunk]);
    for (const chunk of chunks) {
        if (chunk.repository_id !== "_workspace")
            links.push({ from: chunk.id, to: `component:${chunk.repository_id}`, type: "belongs_to", status: "supported", fact_ids: [], evidence_ids: [] });
        for (const target of chunk.outgoing_links) {
            const normalized = target.replace(/^\.\//u, "").replace(/^\.\.\//u, "");
            const candidates = chunks.filter((item) => item.document_path.endsWith(`${normalized}.md`) || item.document_path.endsWith(normalized));
            for (const candidate of candidates.slice(0, 3))
                links.push({ from: chunk.id, to: candidate.id, type: "documents", status: "supported", fact_ids: [], evidence_ids: [] });
        }
        for (const symbol of chunk.symbols)
            links.push({ from: chunk.id, to: `symbol:${chunk.repository_id}:${symbol}`, type: "contains_symbol", status: "supported", fact_ids: [], evidence_ids: chunk.evidence_ids });
    }
    for (const fact of facts) {
        const value = asRecord(fact.value);
        if (fact.kind === "code_symbol") {
            const name = String(value.name ?? ""), className = typeof value.class_name === "string" ? value.class_name : null;
            if (name !== "" && className !== null && name !== className)
                links.push({ from: `symbol:${fact.component_id}:${className}`, to: `symbol:${fact.component_id}:${className}.${name}`, type: "contains_symbol", status: "supported", fact_ids: [fact.id], evidence_ids: fact.evidence_ids });
            const signature = String(value.signature ?? "");
            for (const match of signature.matchAll(/\b(?:implements|extends)\s+([A-Za-z_$][\w$]*)/gu))
                if (name !== "")
                    links.push({ from: `symbol:${fact.component_id}:${name}`, to: `symbol:${fact.component_id}:${match[1]}`, type: signature.includes("implements") ? "implements" : "implemented_by", status: "supported", fact_ids: [fact.id], evidence_ids: fact.evidence_ids });
            for (const match of signature.matchAll(/\b(?:R2dbcRepository|ReactiveCrudRepository|ReactiveMongoRepository|CrudRepository|JpaRepository)\s*<\s*([A-Za-z_$][\w$]*)/gu))
                if (name !== "")
                    links.push({ from: `symbol:${fact.component_id}:${name}`, to: `symbol:${fact.component_id}:${match[1]}`, type: "persists_with", status: "supported", fact_ids: [fact.id], evidence_ids: fact.evidence_ids });
            const snippet = String(value.snippet ?? "");
            if (String(value.symbol_type ?? "") === "class")
                for (const match of snippet.matchAll(/\bprivate\s+final\s+([A-Z][A-Za-z0-9_$]*)\s+[A-Za-z_$][\w$]*\s*;/gu))
                    if (name !== "")
                        links.push({ from: `symbol:${fact.component_id}:${name}`, to: `symbol:${fact.component_id}:${match[1]}`, type: "injects", status: "supported", fact_ids: [fact.id], evidence_ids: fact.evidence_ids });
            if (String(value.role ?? "") === "mapper")
                for (const match of signature.matchAll(/\b([A-Z][A-Za-z0-9_$]*(?:Entity|Dto|DTO|T))\b/gu)) {
                    const owner = className ?? name;
                    if (owner !== "" && match[1] !== owner)
                        links.push({ from: `symbol:${fact.component_id}:${owner}${name !== owner ? `.${name}` : ""}`, to: `symbol:${fact.component_id}:${match[1]}`, type: "maps_to", status: "supported", fact_ids: [fact.id], evidence_ids: fact.evidence_ids });
                }
            for (const match of snippet.matchAll(/\b([A-Z][A-Za-z0-9_$]*)\s*(?:::|\.)\s*([A-Za-z_$][\w$]*)/gu)) {
                const owner = className ?? name;
                if (owner !== "")
                    links.push({ from: `symbol:${fact.component_id}:${owner}${name !== owner ? `.${name}` : ""}`, to: `symbol:${fact.component_id}:${match[1]}.${match[2]}`, type: /Mapper/iu.test(match[1]) ? "maps_to" : "calls", status: "supported", fact_ids: [fact.id], evidence_ids: fact.evidence_ids });
            }
        }
        const reactiveOperator = fact.kind === "symbol_call" && typeof value.callee_name === "string" && /^(?:map|flatMap|filter|collectList|onErrorResume|onErrorMap|switchIfEmpty|zip|then|defer|just|error)$/u.test(value.callee_name);
        const relation = reactiveOperator ? "reactive_stage" : relationForFact(fact.kind);
        if (relation === null)
            continue;
        const callerClass = typeof value.caller_class === "string" ? value.caller_class : typeof value.class_name === "string" ? value.class_name : null;
        const callerName = typeof value.caller_name === "string" ? value.caller_name : null;
        const targetClass = typeof value.target_class === "string" ? value.target_class : typeof value.dependency_type === "string" ? value.dependency_type : null;
        const targetName = typeof value.callee_name === "string" ? value.callee_name : null;
        const from = callerClass === null ? String(value.source_path ?? fact.component_id) : `${callerClass}${callerName === null ? "" : `.${callerName}`}`;
        const to = reactiveOperator ? `reactor:${String(value.callee_name)}` : targetClass === null ? String(value.target_path ?? value.entity ?? value.resource ?? value.target ?? "unresolved") : `${targetClass}${targetName === null || relation === "injects" ? "" : `.${targetName}`}`;
        links.push({ from: `symbol:${fact.component_id}:${from}`, to: reactiveOperator ? to : `symbol:${fact.component_id}:${to}`, type: relation, status: reactiveOperator ? "supported" : String(value.resolution ?? "supported"), fact_ids: [fact.id], evidence_ids: fact.evidence_ids });
    }
    for (const edge of graph?.edges ?? [])
        links.push({ from: edge.from, to: edge.to, type: graphRelation(edge.type), status: edge.status, fact_ids: edge.fact_ids, evidence_ids: edge.evidence_ids });
    return dedupeLinks(links);
}
function graphRelation(type) { if (type === "calls_http")
    return "consumes"; if (type === "publishes_to")
    return "publishes"; if (type === "consumes_from")
    return "subscribes"; if (/front/iu.test(type))
    return "used_by_front"; return "still_depends_on"; }
function relationForFact(kind) {
    const map = { symbol_call: "calls", dependency_injection: "injects", dependency_binding: "implements", data_read: "reads_from", data_write: "writes_to", http_endpoint: "exposes", http_client_call: "consumes", message_publish: "publishes", message_consume: "subscribes" };
    return map[kind] ?? (/mapper/iu.test(kind) ? "maps_to" : /repository|persist/iu.test(kind) ? "persists_with" : null);
}
function buildCapabilities(runId, chunks, links, facts, overrides) {
    const candidates = new Map();
    for (const chunk of chunks.filter((item) => item.endpoint !== null)) {
        const endpoint = chunk.endpoint, slug = capabilitySlug(endpoint.path);
        const current = candidates.get(slug) ?? { id: slug, name: titleFromSlug(slug), aliases: [], repositories: [], entrypoints: [], flows: [], responsibilities: [], legacy_dependencies: [], contracts: [], data_resources: [], document_chunk_ids: [], evidence_ids: [], confidence: "medium" };
        current.repositories = unique([...current.repositories, chunk.repository_id]);
        current.entrypoints = unique([...current.entrypoints, `${endpoint.method} ${endpoint.path}`]);
        current.flows = unique([...current.flows, chunk.document_path]);
        current.document_chunk_ids = unique([...current.document_chunk_ids, chunk.id]);
        current.evidence_ids = unique([...current.evidence_ids, ...chunk.evidence_ids]);
        current.contracts = unique([...current.contracts, `${endpoint.method} ${endpoint.path}`]);
        if (!current.responsibilities.some((item) => item.repository_id === chunk.repository_id && item.role === "expositor de API"))
            current.responsibilities.push({ repository_id: chunk.repository_id, role: "expositor de API", basis: "extracted", evidence_ids: chunk.evidence_ids });
        candidates.set(slug, current);
    }
    applyCapabilityOverrides(candidates, overrides);
    for (const capability of candidates.values()) {
        const relatedFacts = facts.filter((fact) => capability.repositories.some((repo) => fact.component_id === repo || fact.component_id.startsWith(`${repo}:`)) && capability.entrypoints.some((entry) => JSON.stringify(fact.value).toLocaleLowerCase("en-US").includes(entry.split(" ").slice(1).join(" ").toLocaleLowerCase("en-US"))));
        capability.data_resources = unique(relatedFacts.filter((fact) => /data|repository/iu.test(fact.kind)).map((fact) => String(asRecord(fact.value).entity ?? asRecord(fact.value).resource ?? "")).filter(Boolean));
        capability.confidence = capability.evidence_ids.length > 0 ? "high" : capability.document_chunk_ids.length > 0 ? "medium" : "low";
    }
    void runId;
    void links;
    return [...candidates.values()].sort((a, b) => a.id.localeCompare(b.id));
}
function applyCapabilityOverrides(candidates, overrides) {
    const intelligence = asRecord(overrides?.intelligence), configured = asRecord(intelligence.capabilities), ownership = asRecord(intelligence.ownership), migrations = asRecord(intelligence.migrations);
    for (const [id, raw] of Object.entries(configured)) {
        const value = asRecord(raw), current = candidates.get(id) ?? { id, name: String(value.label ?? titleFromSlug(id)), aliases: [], repositories: [], entrypoints: [], flows: [], responsibilities: [], legacy_dependencies: [], contracts: [], data_resources: [], document_chunk_ids: [], evidence_ids: [], confidence: "low" };
        current.name = String(value.label ?? current.name);
        current.aliases = unique([...current.aliases, ...stringArray(value.aliases)]);
        current.repositories = unique([...current.repositories, ...stringArray(value.systems)]);
        candidates.set(id, current);
    }
    for (const [id, raw] of Object.entries(ownership)) {
        const capability = candidates.get(id);
        if (!capability)
            continue;
        for (const [role, repository] of Object.entries(asRecord(raw)))
            if (typeof repository === "string")
                capability.responsibilities.push({ repository_id: repository, role: role.replaceAll("_", " "), basis: "explicit", evidence_ids: [] });
    }
    for (const [id, raw] of Object.entries(migrations)) {
        const capability = candidates.get(id), value = asRecord(raw);
        if (!capability)
            continue;
        if (typeof value.from === "string" && typeof value.to === "string")
            capability.legacy_dependencies.push({ from: value.from, to: value.to, status: String(value.status ?? "candidate") === "complete" ? "supported" : "candidate" });
    }
}
function lexicalIndex(chunks) { return groupIndex(chunks, (chunk) => tokens(`${chunk.heading ?? ""} ${chunk.content}`).slice(0, 1000)); }
function groupIndex(chunks, keys) { const result = Object.create(null); for (const chunk of chunks)
    for (const key of unique(keys(chunk).map(normalize).filter((value) => value.length > 1)))
        result[key] = unique([...(Object.hasOwn(result, key) ? result[key] : []), chunk.id]); return result; }
function tokens(value) { return normalize(value).split(/[^a-z0-9_./-]+/gu).filter((token) => token.length > 2); }
function normalize(value) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("en-US"); }
function matchedValues(content, values) { const text = normalize(content); return values.filter((value) => new RegExp(`\\b${value}\\b`, "u").test(text)); }
function unique(values) { return [...new Set(values)]; }
function capabilitySlug(path) { return path.replace(/^\//u, "").replace(/[{}]/gu, "").split("/").filter((part) => part !== "api" && !/^v\d+$/u.test(part))[0]?.replace(/[^A-Za-z0-9._-]+/gu, "-").toLocaleLowerCase("en-US") || "capacidad-sin-nombre"; }
function titleFromSlug(value) { return value.split(/[-_.]+/u).map((part) => part.charAt(0).toLocaleUpperCase("es-CO") + part.slice(1)).join(" "); }
function stringArray(value) { return Array.isArray(value) ? value.filter((item) => typeof item === "string") : []; }
function asRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function dedupeLinks(values) { const seen = new Set(); return values.filter((value) => { const key = `${value.from}\0${value.to}\0${value.type}`; if (seen.has(key))
    return false; seen.add(key); return true; }); }
async function loadChunks(root) { try {
    const text = await readFile(join(root, "chunks.jsonl"), "utf8");
    return text.split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
}
catch {
    return [];
} }
async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }
//# sourceMappingURL=index.js.map