import { createDotnetPlugin } from "./dotnet/index.js";
import { createJavaSpringPlugin } from "./java_spring/index.js";
import { createJavaWebFluxPlugin } from "./java_webflux/index.js";
import { createJavaWeblogicPlugin } from "./java_weblogic/index.js";
import { createAngularPlugin } from "./js_angular/index.js";
import { createReactPlugin } from "./js_react/index.js";
import { createNodeExpressPlugin } from "./node_express/index.js";
import { createPythonPlugin } from "./python/index.js";
import { createSourceArchitecturePlugin } from "./source_architecture/index.js";
export class PluginRegistry {
    #plugins = new Map();
    constructor(plugins = builtInPlugins()) { for (const plugin of plugins) {
        if (this.#plugins.has(plugin.id))
            throw new Error(`Plugin duplicado: ${plugin.id}`);
        this.#plugins.set(plugin.id, plugin);
    } }
    get(id) { return this.#plugins.get(id); }
    list() { return [...this.#plugins.values()]; }
    require(id) { const plugin = this.get(id); if (!plugin)
        throw new Error(`Capacidad no soportada: plugin ${id} no instalado.`); return plugin; }
}
export function builtInPlugins() { return [createSourceArchitecturePlugin(), createDotnetPlugin(), createJavaSpringPlugin(), createJavaWebFluxPlugin(), createJavaWeblogicPlugin(), createAngularPlugin(), createReactPlugin(), createNodeExpressPlugin(), createPythonPlugin()]; }
export function capabilityMatrix(registry = new PluginRegistry()) { return { schema_version: 3, plugins: registry.list().map((plugin) => ({ id: plugin.id, version: plugin.version, languages: plugin.supported_languages, capabilities: plugin.capabilities, rules: plugin.rule_versions })) }; }
//# sourceMappingURL=registry.js.map