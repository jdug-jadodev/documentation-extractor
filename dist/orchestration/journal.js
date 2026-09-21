import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { acquireFileLock, atomicWrite } from "../platform/fs.js";
import { contentHash } from "../platform/hash.js";
export class JournalStore {
    knowledgeRoot;
    runId;
    #runRoot;
    constructor(knowledgeRoot, runId) {
        this.knowledgeRoot = knowledgeRoot;
        this.runId = runId;
        this.#runRoot = join(knowledgeRoot, "runs", runId);
    }
    async create(tasks) {
        await mkdir(this.#runRoot, { recursive: true });
        const now = new Date().toISOString();
        const journal = { schema_version: 3, run_id: this.runId, status: "planned", created_at: now, updated_at: now, tasks: tasks.map((task) => ({ id: task.id, kind: task.kind, dependencies: task.dependencies, status: "pending", input_hash: contentHash(task.input), output_hash: null, error: null })), snapshot_ids: [], usage: { ai_invocations: 0, provider_turns: null, input_tokens: null, output_tokens: null, provider_amount: null, unit: null, source: "coordinator", observation_scope: this.runId, observed_at: now } };
        await this.save(journal);
        return journal;
    }
    async load() { return JSON.parse(await readFile(join(this.#runRoot, "run.json"), "utf8")); }
    async save(journal) { journal.updated_at = new Date().toISOString(); await atomicWrite(join(this.#runRoot, "run.json"), `${JSON.stringify(journal, null, 2)}\n`); }
    async lock() { return await acquireFileLock(join(this.knowledgeRoot, "locks", `${this.runId}.lock`), { pid: process.pid, run_id: this.runId }); }
    artifactPath(...parts) { return join(this.#runRoot, ...parts); }
}
//# sourceMappingURL=journal.js.map