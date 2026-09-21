import type { RunStatus, TaskStatus, UsageRecord } from "../contracts/types.js";
import { type FileLock } from "../platform/fs.js";
export interface JournalTask {
    id: string;
    kind: string;
    dependencies: string[];
    status: TaskStatus;
    input_hash: string;
    output_hash: string | null;
    error: string | null;
}
export interface RunJournal {
    schema_version: 3;
    run_id: string;
    status: RunStatus;
    created_at: string;
    updated_at: string;
    tasks: JournalTask[];
    snapshot_ids: string[];
    usage: UsageRecord;
}
export declare class JournalStore {
    #private;
    private readonly knowledgeRoot;
    readonly runId: string;
    constructor(knowledgeRoot: string, runId: string);
    create(tasks: Array<{
        id: string;
        kind: string;
        dependencies: string[];
        input: unknown;
    }>): Promise<RunJournal>;
    load(): Promise<RunJournal>;
    save(journal: RunJournal): Promise<void>;
    lock(): Promise<FileLock>;
    artifactPath(...parts: string[]): string;
}
