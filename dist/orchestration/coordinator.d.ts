import { JournalStore, type RunJournal } from "./journal.js";
export interface CoordinatedTask<T = unknown> {
    id: string;
    kind: string;
    dependencies: string[];
    input: unknown;
    execute(signal: AbortSignal): Promise<T>;
}
export interface CoordinatorResult {
    journal: RunJournal;
    outputs: Map<string, unknown>;
}
export declare class Coordinator {
    #private;
    constructor(store: JournalStore, tasks: CoordinatedTask[]);
    run(options?: {
        signal?: AbortSignal;
    }): Promise<CoordinatorResult>;
}
