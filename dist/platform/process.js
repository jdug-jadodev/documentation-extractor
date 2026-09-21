import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { basename, resolve } from "node:path";
const ALLOWED_EXECUTABLES = new Set(["git", "git.exe", "copilot", "copilot.exe"]);
export async function runRestrictedProcess(request) {
    const executableName = basename(request.executable).toLocaleLowerCase("en-US");
    if (!ALLOWED_EXECUTABLES.has(executableName))
        throw new Error(`Ejecutable no autorizado: ${executableName}`);
    if (request.args.some((argument) => argument.includes("\0")))
        throw new Error("Argumento con byte NUL rechazado.");
    const environment = buildEnvironment(request.allowed_environment ?? {});
    return await new Promise((resolvePromise, reject) => {
        const child = spawn(resolve(request.executable), [...request.args], { cwd: request.cwd, shell: false, windowsHide: true, env: environment, stdio: ["pipe", "pipe", "pipe"] });
        const stdoutDecoder = new StringDecoder("utf8");
        const stderrDecoder = new StringDecoder("utf8");
        let stdout = "";
        let stderr = "";
        let stdoutBytes = 0;
        let stderrBytes = 0;
        let timedOut = false;
        let settled = false;
        const terminate = () => { if (!child.killed)
            child.kill(process.platform === "win32" ? undefined : "SIGTERM"); };
        const timer = setTimeout(() => { timedOut = true; terminate(); }, request.timeout_ms);
        request.signal?.addEventListener("abort", terminate, { once: true });
        child.stdout.on("data", (chunk) => {
            stdoutBytes += chunk.byteLength;
            if (stdoutBytes > request.max_stdout_bytes) {
                terminate();
                return;
            }
            stdout += stdoutDecoder.write(chunk);
        });
        child.stderr.on("data", (chunk) => {
            stderrBytes += chunk.byteLength;
            if (stderrBytes > request.max_stderr_bytes) {
                terminate();
                return;
            }
            stderr += stderrDecoder.write(chunk);
        });
        child.once("error", (error) => { if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(error);
        } });
        child.once("close", (code) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            stdout += stdoutDecoder.end();
            stderr += stderrDecoder.end();
            if (stdoutBytes > request.max_stdout_bytes || stderrBytes > request.max_stderr_bytes)
                return reject(new Error("La salida del proceso excedió el límite configurado."));
            if (request.signal?.aborted)
                return reject(Object.assign(new Error("Operación cancelada."), { code: "ABORT_ERR" }));
            resolvePromise({ exit_code: code ?? 5, stdout, stderr, timed_out: timedOut });
        });
        if (request.stdin !== undefined)
            child.stdin.end(request.stdin, "utf8");
        else
            child.stdin.end();
    });
}
function buildEnvironment(extra) {
    const safeKeys = ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "LANG", "LC_ALL", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "GIT_CONFIG_NOSYSTEM"];
    const result = { GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" };
    for (const key of safeKeys)
        if (process.env[key] !== undefined)
            result[key] = process.env[key];
    for (const [key, value] of Object.entries(extra))
        result[key] = value;
    delete result.NODE_OPTIONS;
    delete result.GIT_CONFIG_GLOBAL;
    return result;
}
//# sourceMappingURL=process.js.map