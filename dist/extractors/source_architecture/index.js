import { posix } from "node:path";
import { compareBytes, sha256, stableId } from "../../platform/hash.js";
import { BoundedWorkerPool } from "../../platform/worker_pool.js";
const SOURCE = /\.(?:[cm]?[jt]s|tsx|jsx|java)$/iu;
const DOCUMENTABLE = /(?:\.(?:[cm]?[jt]s|tsx|jsx|java|json|ya?ml|xml|properties|gradle|kts|md|sql)|(?:^|\/)(?:Dockerfile|Jenkinsfile))$/iu;
export class SourceArchitecturePlugin {
    id = "source-architecture";
    version = "2.1.0";
    supported_languages = ["javascript", "typescript", "tsx", "java"];
    capabilities = { modules: "implemented", symbols: "implemented", calls: "implemented", composition: "implemented", imports: "implemented", manifests: "implemented" };
    rule_versions = { "repository.file": "1", "repository.build-module": "1", "repository.build-dependency": "1", "source.module": "2", "source.symbol": "4", "source.call": "1", "source.construction": "1", "source.injection": "2", "source.binding": "1", "source.type-relation": "1", "source.import": "2", "package.dependencies": "1", "package.scripts": "1", "package.runtime": "1" };
    async detect(inventory) {
        const paths = inventory.files.filter((file) => file.excluded_reason === null && SOURCE.test(file.relative_path)).map((file) => file.relative_path);
        return paths.length === 0 ? [] : [{ plugin_id: this.id, component_id: inventory.repository_id, languages: [...this.supported_languages], evidence_paths: paths.slice(0, 20) }];
    }
    async extract(reader, component, options) {
        const allEntries = [...await reader.list()].filter((entry) => entry.kind === "blob").sort((a, b) => compareBytes(a.relative_path, b.relative_path));
        const sourcePaths = new Set(allEntries.filter((entry) => SOURCE.test(entry.relative_path)).map((entry) => entry.relative_path));
        const entries = options.include_paths === undefined ? allEntries : allEntries.filter((entry) => options.include_paths.has(entry.relative_path));
        const facts = [], evidence = [], diagnostics = [];
        const processed = { modules: 0, symbols: 0, calls: 0, composition: 0, imports: 0, manifests: 0 };
        const grammar = new BoundedWorkerPool(new URL("../grammar_worker.js", import.meta.url), 2);
        try {
            for (const entry of entries) {
                if (!DOCUMENTABLE.test(entry.relative_path) || entry.size > options.max_file_bytes)
                    continue;
                let source;
                try {
                    source = Buffer.from(await reader.read(entry.relative_path, { maxBytes: options.max_file_bytes, ...(options.signal === undefined ? {} : { signal: options.signal }) })).toString("utf8");
                }
                catch (error) {
                    diagnostics.push(readDiagnostic(reader, entry.relative_path, error));
                    continue;
                }
                const metadata = pathMetadata(entry.relative_path);
                addFact(reader, component.component_id, entry, source, "repository_file", { path: entry.relative_path, kind: fileKind(entry.relative_path), ...metadata }, "repository.file", 0, Math.min(source.length, 1), facts, evidence);
                if (SOURCE.test(entry.relative_path)) {
                    processed.modules += 1;
                    addFact(reader, component.component_id, entry, source, "source_module", { path: entry.relative_path, language: language(entry.relative_path), layer: layer(entry.relative_path), role: role(entry.relative_path), ...metadata }, "source.module", 0, Math.min(source.length, 1), facts, evidence);
                    let analysis = null;
                    try {
                        const parsed = await grammar.run({ grammarRoot: options.grammar_root, language: language(entry.relative_path), source }, { timeoutMs: 30_000, ...(options.signal === undefined ? {} : { signal: options.signal }) });
                        analysis = parsed.analysis;
                        if (parsed.hasErrors)
                            diagnostics.push(architectureDiagnostic(reader, entry.relative_path, "SYNTAX_PARTIAL", "El AST contiene errores; se conservaron los nodos reconocibles.", "warning"));
                    }
                    catch (error) {
                        diagnostics.push(architectureDiagnostic(reader, entry.relative_path, "AST_UNAVAILABLE", error instanceof Error ? error.message : String(error), "warning"));
                    }
                    if (analysis !== null) {
                        const classMethods = new Map();
                        for (const symbol of analysis.symbols)
                            if (symbol.class_name !== null && symbol.symbol_type === "method")
                                classMethods.set(symbol.class_name, [...(classMethods.get(symbol.class_name) ?? []), symbol.name]);
                        for (const symbol of analysis.symbols) {
                            processed.symbols += 1;
                            const calls = symbol.calls.map((call) => call.name);
                            const symbolId = stableId("symbol", component.component_id, entry.relative_path, symbol.class_name, symbol.name, symbol.start);
                            addFact(reader, component.component_id, entry, source, "code_symbol", {
                                symbol_id: symbolId, name: symbol.name, symbol_type: symbol.symbol_type, class_name: symbol.class_name,
                                exported: symbol.exported, visibility: symbol.visibility, static: symbol.static, async: symbol.async,
                                parameters: symbol.parameters, signature: symbol.signature, calls: [...new Set(calls)], call_details: symbol.calls,
                                start_line: symbol.start_line, end_line: symbol.end_line, snippet: symbol.snippet,
                                description: describeSymbol(symbol.symbol_type, symbol.name, symbol.symbol_type === "class" ? classMethods.get(symbol.name) ?? [] : calls),
                                description_basis: "AST, firma y llamadas observadas", source_path: entry.relative_path, layer: layer(entry.relative_path), role: role(entry.relative_path), ...metadata
                            }, "source.symbol", symbol.start, symbol.end, facts, evidence);
                            for (const call of symbol.calls) {
                                processed.calls += 1;
                                addFact(reader, component.component_id, entry, source, "symbol_call", callValue(symbol, symbolId, call, entry.relative_path), "source.call", call.start, call.end, facts, evidence);
                            }
                        }
                        for (const construction of analysis.constructions) {
                            processed.composition += 1;
                            addFact(reader, component.component_id, entry, source, "object_construction", { ...construction, source_path: entry.relative_path }, "source.construction", construction.start, construction.end, facts, evidence);
                        }
                        for (const injection of analysis.injections.filter((item) => item.dependency_type !== null && isArchitecturalType(item.dependency_type))) {
                            processed.composition += 1;
                            addFact(reader, component.component_id, entry, source, "dependency_injection", { ...injection, source_path: entry.relative_path }, "source.injection", injection.start, injection.end, facts, evidence);
                        }
                    }
                    else
                        for (const descriptor of symbols(source)) {
                            processed.symbols += 1;
                            addFact(reader, component.component_id, entry, source, "code_symbol", { ...descriptor.value, symbol_id: stableId("symbol", component.component_id, entry.relative_path, descriptor.value.class_name ?? null, descriptor.value.name, descriptor.index), source_path: entry.relative_path, layer: layer(entry.relative_path), role: role(entry.relative_path), extraction_mode: "fallback" }, "source.symbol", descriptor.index, descriptor.index + descriptor.text.length, facts, evidence);
                        }
                    for (const descriptor of imports(source, entry.relative_path, sourcePaths)) {
                        processed.imports += 1;
                        addFact(reader, component.component_id, entry, source, "module_dependency", descriptor.value, "source.import", descriptor.index, descriptor.index + descriptor.text.length, facts, evidence);
                    }
                    for (const descriptor of implicitJavaInjections(source)) {
                        processed.composition += 1;
                        addFact(reader, component.component_id, entry, source, "dependency_injection", { ...descriptor.value, source_path: entry.relative_path }, "source.injection", descriptor.index, descriptor.index + descriptor.text.length, facts, evidence);
                    }
                    for (const descriptor of javaTypeRelations(source))
                        addFact(reader, component.component_id, entry, source, "type_relation", { ...descriptor.value, source_path: entry.relative_path }, "source.type-relation", descriptor.index, descriptor.index + descriptor.text.length, facts, evidence);
                }
                else {
                    processed.manifests += 1;
                    if (/(^|\/)package\.json$/iu.test(entry.relative_path))
                        extractPackageJson(reader, component.component_id, entry, source, facts, evidence, diagnostics);
                    if (/(^|\/)(?:build|settings)\.gradle(?:\.kts)?$/iu.test(entry.relative_path))
                        extractGradleModules(reader, component.component_id, entry, source, facts, evidence);
                }
            }
        }
        finally {
            await grammar.close();
        }
        const resolvedFacts = resolveSourceSemanticFacts(facts);
        const coverage_by_capability = Object.entries(this.capabilities).map(([capability, status]) => ({ capability, status, processed: processed[capability], failed: 0, limitations: [] }));
        return { plugin_id: this.id, plugin_version: this.version, facts: unique(resolvedFacts), evidence: unique(evidence), diagnostics, coverage_by_capability, dependencies: entries.filter((entry) => DOCUMENTABLE.test(entry.relative_path)).map((entry) => entry.relative_path) };
    }
}
export function createSourceArchitecturePlugin() { return new SourceArchitecturePlugin(); }
function callValue(symbol, symbolId, call, sourcePath) {
    return {
        caller_symbol_id: symbolId,
        caller_name: symbol.name,
        caller_class: symbol.class_name,
        callee_name: call.name,
        receiver: call.receiver,
        expression: call.expression,
        target_symbol_id: null,
        target_class: null,
        target_path: null,
        resolution: "unresolved",
        source_path: sourcePath
    };
}
export function resolveSourceSemanticFacts(facts) {
    const withoutDerivedBindings = facts.filter((fact) => fact.kind !== "dependency_binding");
    const components = [...new Set(withoutDerivedBindings.map((fact) => fact.component_id))];
    return components.flatMap((componentId) => resolveSemanticFacts(componentId, withoutDerivedBindings.filter((fact) => fact.component_id === componentId)));
}
function resolveSemanticFacts(componentId, facts) {
    const symbols = facts.filter((fact) => fact.kind === "code_symbol").map((fact) => ({ fact, value: asRecord(fact.value) }));
    const byId = new Map(symbols.map((item) => [String(item.value.symbol_id ?? ""), item]));
    const byClassMethod = new Map();
    const byName = new Map();
    for (const item of symbols) {
        const name = String(item.value.name ?? ""), className = nullableString(item.value.class_name);
        byName.set(name, [...(byName.get(name) ?? []), item]);
        if (className !== null)
            byClassMethod.set(`${className}\0${name}`, [...(byClassMethod.get(`${className}\0${name}`) ?? []), item]);
    }
    const injections = facts.filter((fact) => fact.kind === "dependency_injection").map((fact) => asRecord(fact.value));
    const constructions = facts.filter((fact) => fact.kind === "object_construction").map((fact) => asRecord(fact.value));
    const variableTypes = new Map();
    for (const value of constructions)
        if (typeof value.variable === "string")
            variableTypes.set(normalizeReceiver(value.variable), String(value.constructed_type ?? "unknown"));
    const injectionTypes = new Map();
    for (const value of injections)
        if (typeof value.class_name === "string" && typeof value.parameter === "string" && typeof value.dependency_type === "string")
            injectionTypes.set(`${value.class_name}\0${value.parameter}`, simpleType(value.dependency_type));
    const result = facts.map((fact) => {
        if (fact.kind !== "symbol_call")
            return fact;
        const value = asRecord(fact.value), caller = byId.get(String(value.caller_symbol_id ?? "")), receiver = nullableString(value.receiver), callee = String(value.callee_name ?? "");
        const callerClass = nullableString(caller?.value.class_name ?? value.caller_class);
        let targetClass = null;
        if (receiver === "this" || receiver === "super")
            targetClass = callerClass;
        else if (receiver?.startsWith("this.") === true && callerClass !== null)
            targetClass = injectionTypes.get(`${callerClass}\0${receiver.slice(5).split(".")[0]}`) ?? null;
        else if (receiver !== null)
            targetClass = variableTypes.get(normalizeReceiver(receiver)) ?? (callerClass === null ? undefined : injectionTypes.get(`${callerClass}\0${normalizeReceiver(receiver).split(".")[0]}`)) ?? (byClassMethod.has(`${simpleType(receiver)}\0${callee}`) ? simpleType(receiver) : null);
        let candidates = targetClass === null ? [] : byClassMethod.get(`${targetClass}\0${callee}`) ?? [];
        if (candidates.length === 0 && callerClass !== null)
            candidates = byClassMethod.get(`${callerClass}\0${callee}`) ?? [];
        if (candidates.length === 0)
            candidates = byName.get(callee) ?? [];
        const target = candidates.length === 1 ? candidates[0] : undefined;
        const resolution = target !== undefined ? "supported" : candidates.length > 1 ? "candidate" : "unresolved";
        const resolvedValue = { ...value, target_symbol_id: target?.value.symbol_id ?? null, target_class: target?.value.class_name ?? targetClass, target_path: target?.value.source_path ?? null, resolution };
        return { ...fact, id: stableId("fact", componentId, fact.kind, resolvedValue, fact.evidence_ids[0] ?? ""), value: resolvedValue };
    });
    for (const construction of constructions) {
        const className = simpleType(String(construction.constructed_type ?? ""));
        const args = Array.isArray(construction.arguments) ? construction.arguments.map(String) : [];
        const classInjections = injections.filter((item) => item.class_name === className);
        for (let index = 0; index < Math.min(args.length, classInjections.length); index += 1) {
            const injection = classInjections[index], argument = normalizeReceiver(args[index]);
            const implementation = variableTypes.get(argument) ?? simpleType(args[index]);
            const value = { consumer_class: className, injection_point: injection.parameter, declared_type: injection.dependency_type ?? null, implementation_type: implementation || null, argument: args[index], source_path: construction.source_path, resolution: variableTypes.has(argument) ? "supported" : "candidate" };
            const evidenceIds = facts.find((fact) => fact.kind === "object_construction" && asRecord(fact.value).start === construction.start)?.evidence_ids ?? [];
            result.push({ schema_version: 3, id: stableId("fact", componentId, "dependency_binding", value, evidenceIds), kind: "dependency_binding", component_id: componentId, value, evidence_ids: evidenceIds, rule_id: "source.binding" });
        }
    }
    return result;
}
function nullableString(value) { return typeof value === "string" && value.trim() !== "" ? value : null; }
function normalizeReceiver(value) { return value.replace(/^this\./u, "").replace(/\?\./gu, ".").trim(); }
function simpleType(value) { return value.replace(/<.*>/gu, "").replace(/\[\]$/u, "").split(/[.$]/u).at(-1)?.trim() ?? value; }
function asRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function architectureDiagnostic(reader, path, code, message, severity) { return { schema_version: 3, id: stableId("diagnostic", reader.snapshot.id, path, code), severity, code, scope: path, message, evidence_ids: [], suggested_action: "Revise solo el archivo indicado; los demás símbolos AST se conservan." }; }
function symbols(source) {
    const patterns = [
        ["class", /\b(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gu],
        ["interface", /\bexport\s+interface\s+([A-Za-z_$][\w$]*)/gu],
        ["type", /\bexport\s+type\s+([A-Za-z_$][\w$]*)\s*=/gu],
        ["enum", /\bexport\s+(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/gu],
        ["function", /\bexport\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gu],
        ["function", /\bexport\s+const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/gu]
    ];
    const result = patterns.flatMap(([kind, pattern]) => [...source.matchAll(pattern)].map((match) => {
        const name = match[1] ?? "unknown";
        return { index: match.index ?? 0, text: match[0], value: { name, symbol_type: kind, exported: true, signature: compactSignature(match[0]), description: describeSymbol(kind, name, []) } };
    }));
    const classPattern = /\b(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)[^\{]*\{/gu;
    for (const classMatch of source.matchAll(classPattern)) {
        const className = classMatch[1] ?? "unknown";
        const open = (classMatch.index ?? 0) + classMatch[0].lastIndexOf("{");
        const close = matchingBrace(source, open);
        if (close === null)
            continue;
        const body = source.slice(open + 1, close);
        const methodPattern = /(?:^|\n)\s*(?:(public|private|protected)\s+)?(?:(static)\s+)?(?:(async)\s+)?(?:(get|set)\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?::[^\{;\n]+)?\s*\{/gu;
        for (const methodMatch of body.matchAll(methodPattern)) {
            const name = methodMatch[5] ?? "unknown";
            if (["if", "for", "while", "switch", "catch", "function"].includes(name))
                continue;
            const absolute = open + 1 + (methodMatch.index ?? 0) + methodMatch[0].search(/\S/u);
            const methodOpen = open + 1 + (methodMatch.index ?? 0) + methodMatch[0].lastIndexOf("{");
            const methodClose = matchingBrace(source, methodOpen) ?? methodOpen;
            const calls = calledSymbols(source.slice(methodOpen + 1, methodClose), name);
            const signature = compactSignature(methodMatch[0].replace(/\{$/u, ""));
            result.push({
                index: absolute,
                text: signature,
                value: {
                    name,
                    symbol_type: "method",
                    class_name: className,
                    exported: false,
                    visibility: methodMatch[1] ?? "default",
                    static: methodMatch[2] === "static",
                    async: methodMatch[3] === "async",
                    accessor: methodMatch[4] ?? null,
                    parameters: parameterNames(methodMatch[6] ?? ""),
                    signature,
                    calls,
                    description: describeSymbol("method", name, calls),
                    description_basis: calls.length > 0 ? "nombre y llamadas observadas" : "nombre y firma observados"
                }
            });
        }
    }
    return result;
}
function matchingBrace(source, open) {
    if (source[open] !== "{")
        return null;
    let depth = 0, quote = null, escaped = false, lineComment = false, blockComment = false;
    for (let index = open; index < source.length; index += 1) {
        const char = source[index], next = source[index + 1] ?? "";
        if (lineComment) {
            if (char === "\n")
                lineComment = false;
            continue;
        }
        if (blockComment) {
            if (char === "*" && next === "/") {
                blockComment = false;
                index += 1;
            }
            continue;
        }
        if (quote !== null) {
            if (escaped)
                escaped = false;
            else if (char === "\\")
                escaped = true;
            else if (char === quote)
                quote = null;
            continue;
        }
        if (char === "/" && next === "/") {
            lineComment = true;
            index += 1;
            continue;
        }
        if (char === "/" && next === "*") {
            blockComment = true;
            index += 1;
            continue;
        }
        if (char === "'" || char === '"' || char === "`") {
            quote = char;
            continue;
        }
        if (char === "{")
            depth += 1;
        if (char === "}" && --depth === 0)
            return index;
    }
    return null;
}
function parameterNames(value) {
    return value.split(",").map((item) => item.trim().replace(/^(?:\.\.\.)?/u, "").split(/[?:=]/u)[0]?.trim() ?? "").filter(Boolean);
}
function calledSymbols(body, ownName) {
    const excluded = new Set(["if", "for", "while", "switch", "catch", "return", "throw", "new", "super", ownName]);
    return [...new Set([...body.matchAll(/\b(?:this\.)?([A-Za-z_$][\w$]*)\s*\(/gu)].map((match) => match[1] ?? "").filter((name) => name !== "" && !excluded.has(name)))].slice(0, 12);
}
function compactSignature(value) { return value.replace(/\s+/gu, " ").trim().slice(0, 300); }
function describeSymbol(kind, name, calls) {
    const words = name.replace(/([a-z0-9])([A-Z])/gu, "$1 $2").replace(/[_-]+/gu, " ").toLocaleLowerCase("es-CO");
    const verb = /^(get|find|load|read|fetch)\b/u.test(words) ? "Obtiene o consulta"
        : /^(create|add|insert|register|save)\b/u.test(words) ? "Crea o registra"
            : /^(update|set|change)\b/u.test(words) ? "Actualiza"
                : /^(delete|remove|clear|revoke)\b/u.test(words) ? "Elimina o revoca"
                    : /^(validate|check|assert|verify)\b/u.test(words) ? "Valida"
                        : /^(build|make|compose|generate)\b/u.test(words) ? "Construye o genera"
                            : /^(map|convert|transform|to)\b/u.test(words) ? "Transforma"
                                : /^(send|publish|emit|notify)\b/u.test(words) ? "Envía o publica"
                                    : /^(handle|process|execute|run)\b/u.test(words) ? "Procesa"
                                        : kind === "class" ? "Agrupa la responsabilidad"
                                            : kind === "method" ? "Ejecuta la operación"
                                                : "Implementa";
    const callText = calls.length > 0 ? `; invoca ${calls.join(", ")}` : "";
    return `${verb} asociada a «${words}»${callText}. Descripción derivada del código estático.`;
}
function imports(source, sourcePath, paths) {
    if (/\.java$/iu.test(sourcePath)) {
        return [...source.matchAll(/\bimport\s+(?:static\s+)?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$*][\w$]*)+)\s*;/gu)].map((match) => {
            const specifier = match[1] ?? "", simpleName = specifier.split(".").at(-1) ?? specifier;
            const targetPath = resolveJavaModule(specifier, paths);
            return { index: match.index ?? 0, text: match[0], value: { source_path: sourcePath, specifier, target_path: targetPath, external: targetPath === null, imports: simpleName === "*" ? [] : [simpleName] } };
        });
    }
    const pattern = /\bimport\s+(?!\()([\s\S]{1,300}?)\s+from\s+["']([^"']+)["']|\bimport\s+["']([^"']+)["']/gu;
    return [...source.matchAll(pattern)].map((match) => {
        const specifier = match[2] ?? match[3] ?? "";
        const clause = match[1]?.trim() ?? "side-effect";
        return { index: match.index ?? 0, text: match[0], value: { source_path: sourcePath, specifier, target_path: specifier.startsWith(".") ? resolveModule(sourcePath, specifier, paths) : null, external: !specifier.startsWith("."), imports: importedNames(clause) } };
    });
}
function resolveJavaModule(specifier, paths) {
    const suffix = `${specifier.replaceAll(".", "/")}.java`;
    return [...paths].find((path) => path.endsWith(suffix)) ?? null;
}
function importedNames(clause) {
    if (clause === "side-effect")
        return [];
    const names = new Set();
    const defaultName = /^([A-Za-z_$][\w$]*)/u.exec(clause)?.[1];
    if (defaultName)
        names.add(defaultName);
    const namespace = /\*\s+as\s+([A-Za-z_$][\w$]*)/u.exec(clause)?.[1];
    if (namespace)
        names.add(namespace);
    const named = /\{([^}]+)\}/u.exec(clause)?.[1];
    if (named)
        for (const item of named.split(",")) {
            const name = item.trim().split(/\s+as\s+/u).at(-1)?.trim();
            if (name)
                names.add(name);
        }
    return [...names];
}
function resolveModule(sourcePath, specifier, paths) {
    const base = posix.normalize(posix.join(posix.dirname(sourcePath), specifier));
    const sourceEquivalent = base.replace(/\.(?:mjs|cjs|js|jsx)$/iu, "");
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mts`, `${base}.cts`, `${sourceEquivalent}.ts`, `${sourceEquivalent}.tsx`, `${sourceEquivalent}.mts`, `${sourceEquivalent}.cts`, `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`, `${base}/index.jsx`];
    return candidates.find((candidate) => paths.has(candidate)) ?? null;
}
function extractPackageJson(reader, componentId, entry, source, facts, evidence, diagnostics) {
    let manifest;
    try {
        manifest = JSON.parse(source);
    }
    catch (error) {
        diagnostics.push(readDiagnostic(reader, entry.relative_path, error));
        return;
    }
    const sections = [["runtime", manifest.dependencies], ["development", manifest.devDependencies], ["peer", manifest.peerDependencies], ["optional", manifest.optionalDependencies]];
    for (const [scope, value] of sections)
        if (value && typeof value === "object" && !Array.isArray(value))
            for (const [name, version] of Object.entries(value)) {
                const index = Math.max(0, source.indexOf(`"${name}"`));
                addFact(reader, componentId, entry, source, "package_dependency", { package: name, declared_version: String(version), scope, source_path: entry.relative_path }, "package.dependencies", index, index + name.length + 2, facts, evidence);
            }
    if (manifest.scripts && typeof manifest.scripts === "object" && !Array.isArray(manifest.scripts))
        for (const [name, command] of Object.entries(manifest.scripts)) {
            const index = Math.max(0, source.indexOf(`"${name}"`));
            addFact(reader, componentId, entry, source, "build_script", { name, command: String(command), source_path: entry.relative_path }, "package.scripts", index, index + name.length + 2, facts, evidence);
        }
    const runtimeValues = [];
    if (manifest.packageManager)
        runtimeValues.push({ technology: "package-manager", value: manifest.packageManager });
    if (manifest.engines && typeof manifest.engines === "object")
        runtimeValues.push({ technology: "runtime", value: manifest.engines });
    if (manifest.type)
        runtimeValues.push({ technology: "module-system", value: manifest.type });
    for (const value of runtimeValues)
        addFact(reader, componentId, entry, source, "technology", { ...value, source_path: entry.relative_path }, "package.runtime", 0, 1, facts, evidence);
}
function extractGradleModules(reader, componentId, entry, source, facts, evidence) {
    const owner = posix.dirname(entry.relative_path) || ".";
    addFact(reader, componentId, entry, source, "build_module", { module: owner, manifest: entry.relative_path }, "repository.build-module", 0, Math.min(source.length, 1), facts, evidence);
    for (const match of source.matchAll(/\bproject\s*\(\s*["'](:[^"']+)["']\s*\)/gu)) {
        const target = (match[1] ?? "").replace(/^:/u, "").replaceAll(":", "/");
        addFact(reader, componentId, entry, source, "build_module_dependency", { source_module: owner, target_module: target, declaration: match[0], source_path: entry.relative_path }, "repository.build-dependency", match.index ?? 0, (match.index ?? 0) + match[0].length, facts, evidence);
    }
    if (/settings\.gradle/u.test(entry.relative_path))
        for (const match of source.matchAll(/\binclude\s*\(?\s*([^\r\n)]+)/gu))
            for (const literal of (match[1] ?? "").matchAll(/["'](:[^"']+)["']/gu)) {
                const target = (literal[1] ?? "").replace(/^:/u, "").replaceAll(":", "/");
                addFact(reader, componentId, entry, source, "build_module", { module: target, declared_by: entry.relative_path }, "repository.build-module", match.index ?? 0, (match.index ?? 0) + match[0].length, facts, evidence);
            }
}
function addFact(reader, componentId, entry, source, kind, value, ruleId, characterStart, characterEnd, facts, evidence) {
    const start = Buffer.byteLength(source.slice(0, characterStart), "utf8"), end = Buffer.byteLength(source.slice(0, characterEnd), "utf8");
    const evidenceId = stableId("evidence", reader.snapshot.id, entry.relative_path, start, end, ruleId);
    evidence.push({ schema_version: 3, id: evidenceId, repository_id: reader.snapshot.repository_id, snapshot_id: reader.snapshot.id, relative_path: entry.relative_path, source_hash: sha256(source), locator: { kind: "bytes", start, end }, rule_id: ruleId });
    facts.push({ schema_version: 3, id: stableId("fact", componentId, kind, value, evidenceId), kind, component_id: componentId, value, evidence_ids: [evidenceId], rule_id: ruleId });
}
function pathMetadata(path) {
    const segments = path.split("/");
    const sourceRoot = segments.findIndex((segment, index) => segment === "src" && ["main", "test"].includes(segments[index + 1] ?? ""));
    const sourceSet = sourceRoot >= 0 ? segments[sourceRoot + 1] ?? "unknown" : /(^|\/)(?:test|tests|spec|specs)(\/|$)/iu.test(path) ? "test" : "root";
    const buildModule = sourceRoot > 0 ? segments.slice(0, sourceRoot).join("/") : ".";
    const javaIndex = segments.findIndex((segment, index) => segment === "java" && index > sourceRoot);
    const packageName = javaIndex >= 0 && segments.length > javaIndex + 2 ? segments.slice(javaIndex + 1, -1).join(".") : null;
    const portIndex = segments.findIndex((segment) => segment.toLocaleLowerCase("en-US") === "port");
    const portDirection = portIndex >= 0 && ["in", "out"].includes(segments[portIndex + 1] ?? "") ? segments[portIndex + 1] : null;
    return { source_set: sourceSet, build_module: buildModule, package: packageName, port_direction: portDirection };
}
function fileKind(path) {
    if (SOURCE.test(path))
        return "source";
    if (/(^|\/)(?:pom\.xml|package\.json|build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?)$/iu.test(path))
        return "manifest";
    if (/(^|\/)src\/(?:main|test)\/resources\//iu.test(path))
        return "resource";
    if (/\.(?:md|adoc|rst)$/iu.test(path))
        return "documentation";
    return "configuration";
}
function isArchitecturalType(value) {
    const type = simpleType(value).replace(/[?&]/gu, "");
    return type !== "" && !/^(?:byte|short|int|long|float|double|boolean|char|void|String|Integer|Long|Double|Float|Boolean|Character|BigDecimal|BigInteger|UUID|URI|URL|Date|Instant|LocalDate|LocalDateTime|OffsetDateTime|ZonedDateTime|Object|Class|List|Set|Map|Collection|Optional|Mono|Flux)$/u.test(type);
}
function implicitJavaInjections(source) {
    if (!/@RequiredArgsConstructor\b/u.test(source))
        return [];
    const className = /\b(?:class|record)\s+([A-Za-z_$][\w$]*)/u.exec(source)?.[1] ?? null;
    if (className === null)
        return [];
    const result = [];
    for (const match of source.matchAll(/\bprivate\s+final\s+([A-Za-z_$][\w$]*(?:\s*<[^;=]+>)?(?:\[\])?)\s+([A-Za-z_$][\w$]*)\s*;/gu)) {
        const dependencyType = match[1]?.replace(/\s+/gu, " ").trim() ?? "";
        if (!isArchitecturalType(dependencyType))
            continue;
        result.push({ index: match.index ?? 0, text: match[0], value: { class_name: className, parameter: match[2] ?? "unknown", dependency_type: dependencyType, injection_style: "lombok-required-args-constructor", start: match.index ?? 0, end: (match.index ?? 0) + match[0].length } });
    }
    return result;
}
function javaTypeRelations(source) {
    const result = [];
    const pattern = /\b(class|interface|record)\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([^\{]+?))?(?:\s+implements\s+([^\{]+?))?\s*\{/gu;
    for (const match of source.matchAll(pattern)) {
        const sourceType = match[2] ?? "unknown";
        for (const target of String(match[3] ?? "").split(",").map((value) => simpleType(value.trim())).filter(Boolean))
            result.push({ index: match.index ?? 0, text: match[0], value: { source_type: sourceType, target_type: target, relation: match[1] === "interface" ? "extends" : "inherits" } });
        for (const target of String(match[4] ?? "").split(",").map((value) => simpleType(value.trim())).filter(Boolean))
            result.push({ index: match.index ?? 0, text: match[0], value: { source_type: sourceType, target_type: target, relation: "implements" } });
    }
    return result;
}
function layer(path) { return path.split("/").find((segment) => ["application", "domain", "infrastructure", "infraestructure", "api", "components", "hooks", "navigation", "screens", "services", "store", "tasks", "utils", "workers", "config", "types"].includes(segment.toLocaleLowerCase("en-US")))?.replace("infraestructure", "infrastructure") ?? "root"; }
function role(path) { const normalized = path.toLocaleLowerCase("en-US"); const segments = normalized.split("/"); const portIndex = segments.indexOf("port"); if (portIndex >= 0 && ["in", "out"].includes(segments[portIndex + 1] ?? ""))
    return `port-${segments[portIndex + 1]}`; for (const candidate of ["controller", "handler", "router", "route", "entry-point", "entrypoint", "usecase", "repository", "gateway", "adapter", "middleware", "validator", "mapper", "dto", "entity", "port", "routes", "service", "services", "util", "utils", "hook", "hooks", "component", "components", "screen", "screens", "navigation", "store", "task", "tasks", "worker", "workers", "config", "types"])
    if (segments.includes(candidate))
        return candidate.replace(/s$/u, ""); return "module"; }
function language(path) { if (/\.java$/iu.test(path))
    return "java"; if (/\.tsx$/iu.test(path))
    return "tsx"; if (/\.[cm]?ts$/iu.test(path))
    return "typescript"; return "javascript"; }
function readDiagnostic(reader, path, error) { return { schema_version: 3, id: stableId("diagnostic", reader.snapshot.id, path, "ARCHITECTURE_READ_FAILED"), severity: "error", code: "ARCHITECTURE_READ_FAILED", scope: path, message: error instanceof Error ? error.message : String(error), evidence_ids: [], suggested_action: "Revise el archivo; el resto de la arquitectura se conserva." }; }
function unique(items) { return [...new Map(items.map((item) => [item.id, item])).values()].sort((a, b) => compareBytes(a.id, b.id)); }
//# sourceMappingURL=index.js.map