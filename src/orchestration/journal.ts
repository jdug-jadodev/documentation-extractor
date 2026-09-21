import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RunStatus, TaskStatus, UsageRecord } from "../contracts/types.js";
import { acquireFileLock, atomicWrite, type FileLock } from "../platform/fs.js";
import { contentHash } from "../platform/hash.js";

export interface JournalTask { id: string; kind: string; dependencies: string[]; status: TaskStatus; input_hash: string; output_hash: string | null; error: string | null; }
export interface RunJournal { schema_version: 3; run_id: string; status: RunStatus; created_at: string; updated_at: string; tasks: JournalTask[]; snapshot_ids: string[]; usage: UsageRecord; }

export class JournalStore {
  readonly #runRoot: string;
  constructor(private readonly knowledgeRoot: string, readonly runId: string) { this.#runRoot = join(knowledgeRoot, "runs", runId); }
  async create(tasks: Array<{ id: string; kind: string; dependencies: string[]; input: unknown }>): Promise<RunJournal> {
    await mkdir(this.#runRoot, { recursive: true });
    const now = new Date().toISOString();
    const journal: RunJournal = { schema_version: 3, run_id: this.runId, status: "planned", created_at: now, updated_at: now, tasks: tasks.map((task) => ({ id: task.id, kind: task.kind, dependencies: task.dependencies, status: "pending", input_hash: contentHash(task.input), output_hash: null, error: null })), snapshot_ids: [], usage: { ai_invocations: 0, provider_turns: null, input_tokens: null, output_tokens: null, provider_amount: null, unit: null, source: "coordinator", observation_scope: this.runId, observed_at: now } };
    await this.save(journal); return journal;
  }
  async load(): Promise<RunJournal> { return JSON.parse(await readFile(join(this.#runRoot, "run.json"), "utf8")) as RunJournal; }
  async save(journal: RunJournal): Promise<void> { journal.updated_at = new Date().toISOString(); await atomicWrite(join(this.#runRoot, "run.json"), `${JSON.stringify(journal, null, 2)}\n`); }
  async lock(): Promise<FileLock> { return await acquireFileLock(join(this.knowledgeRoot, "locks", `${this.runId}.lock`), { pid: process.pid, run_id: this.runId }); }
  artifactPath(...parts: string[]): string { return join(this.#runRoot, ...parts); }
}
