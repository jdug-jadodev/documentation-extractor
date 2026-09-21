import type { TaskStatus } from "../contracts/types.js";
import { contentHash } from "../platform/hash.js";
import { JournalStore, type JournalTask, type RunJournal } from "./journal.js";

export interface CoordinatedTask<T = unknown> { id: string; kind: string; dependencies: string[]; input: unknown; execute(signal: AbortSignal): Promise<T>; }
export interface CoordinatorResult { journal: RunJournal; outputs: Map<string, unknown>; }

export class Coordinator {
  readonly #store: JournalStore;
  readonly #tasks: CoordinatedTask[];
  constructor(store: JournalStore, tasks: CoordinatedTask[]) { this.#store = store; this.#tasks = tasks; assertAcyclic(tasks); }

  async run(options: { signal?: AbortSignal } = {}): Promise<CoordinatorResult> {
    const lock = await this.#store.lock();
    const controller = new AbortController();
    const onAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const outputs = new Map<string, unknown>();
    try {
      let journal: RunJournal;
      try { journal = await this.#store.load(); } catch { journal = await this.#store.create(this.#tasks.map((task) => ({ id: task.id, kind: task.kind, dependencies: task.dependencies, input: task.input }))); }
      journal.status = "running"; await this.#store.save(journal);
      while (true) {
        const runnable = this.#tasks.filter((task) => {
          const state = journal.tasks.find((item) => item.id === task.id)!;
          return state.status === "pending" && task.dependencies.every((id) => completed(journal.tasks.find((item) => item.id === id)?.status));
        });
        if (runnable.length === 0) break;
        for (const task of runnable.slice(0, 2)) {
          if (controller.signal.aborted) break;
          const state = journal.tasks.find((item) => item.id === task.id)!;
          state.status = "running"; await this.#store.save(journal);
          try {
            const output = await task.execute(controller.signal);
            outputs.set(task.id, output); state.status = "completed"; state.output_hash = contentHash(output); state.error = null;
          } catch (error) {
            state.status = controller.signal.aborted ? "cancelled" : "failed";
            state.error = error instanceof Error ? error.message : String(error);
          }
          await this.#store.save(journal);
        }
      }
      if (controller.signal.aborted) journal.status = "cancelled";
      else if (journal.tasks.some((task) => task.status === "failed")) journal.status = "failed";
      else if (journal.tasks.some((task) => !completed(task.status))) journal.status = "review_required";
      else journal.status = "review";
      await this.#store.save(journal); return { journal, outputs };
    } finally { options.signal?.removeEventListener("abort", onAbort); await lock.release(); }
  }
}

function completed(status: TaskStatus | undefined): boolean { return status === "completed" || status === "cached"; }
function assertAcyclic(tasks: readonly CoordinatedTask[]): void {
  const ids = new Set(tasks.map((task) => task.id));
  for (const task of tasks) for (const dependency of task.dependencies) if (!ids.has(dependency)) throw new Error(`Dependencia inexistente ${dependency} en ${task.id}.`);
  const visiting = new Set<string>(), visited = new Set<string>(), byId = new Map(tasks.map((task) => [task.id, task]));
  const visit = (id: string) => { if (visiting.has(id)) throw new Error(`Ciclo de tareas detectado en ${id}.`); if (visited.has(id)) return; visiting.add(id); for (const dependency of byId.get(id)!.dependencies) visit(dependency); visiting.delete(id); visited.add(id); };
  for (const task of tasks) visit(task.id);
}
