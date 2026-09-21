export interface ProcessRequest {
    executable: string;
    args: readonly string[];
    cwd: string;
    stdin?: string;
    timeout_ms: number;
    max_stdout_bytes: number;
    max_stderr_bytes: number;
    signal?: AbortSignal;
    allowed_environment?: Record<string, string>;
}
export interface ProcessResult {
    exit_code: number;
    stdout: string;
    stderr: string;
    timed_out: boolean;
}
export declare function runRestrictedProcess(request: ProcessRequest): Promise<ProcessResult>;
