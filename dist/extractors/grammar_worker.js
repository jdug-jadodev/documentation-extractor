import { parentPort } from "node:worker_threads";
import { GrammarManager } from "./grammar.js";
if (parentPort === null)
    throw new Error("grammar_worker solo puede ejecutarse como worker thread.");
const managers = new Map();
parentPort.on("message", (message) => {
    void parse(message);
});
async function parse(message) {
    try {
        let manager = managers.get(message.input.grammarRoot);
        if (!manager) {
            manager = new GrammarManager(message.input.grammarRoot);
            managers.set(message.input.grammarRoot, manager);
        }
        const value = await manager.parse(message.input.language, message.input.source);
        parentPort.postMessage({ id: message.id, ok: true, value });
    }
    catch (error) {
        parentPort.postMessage({ id: message.id, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
}
//# sourceMappingURL=grammar_worker.js.map