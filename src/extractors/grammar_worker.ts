import { parentPort } from "node:worker_threads";
import { GrammarManager } from "./grammar.js";

interface GrammarInput { grammarRoot: string; language: string; source: string; }
interface WorkerMessage { id: number; input: GrammarInput; }

if (parentPort === null) throw new Error("grammar_worker solo puede ejecutarse como worker thread.");

const managers = new Map<string, GrammarManager>();
parentPort.on("message", (message: WorkerMessage) => {
  void parse(message);
});

async function parse(message: WorkerMessage): Promise<void> {
  try {
    let manager = managers.get(message.input.grammarRoot);
    if (!manager) { manager = new GrammarManager(message.input.grammarRoot); managers.set(message.input.grammarRoot, manager); }
    const value = await manager.parse(message.input.language, message.input.source);
    parentPort!.postMessage({ id: message.id, ok: true, value });
  } catch (error) {
    parentPort!.postMessage({ id: message.id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}
