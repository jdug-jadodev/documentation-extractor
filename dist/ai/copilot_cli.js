import { spawn } from "node:child_process";
import { basename } from "node:path";
import { JsonlEventDecoder, extractFinalResponse } from "./jsonl.js";
import { parseAndValidateAgentResult } from "./validation.js";
import { usageFromProvider } from "./usage.js";
import { sanitizeDiagnostic } from "../security/redaction.js";
export class CopilotCliExecutor {
    executable;
    cwd;
    validator;
    constructor(executable, cwd, validator) {
        this.executable = executable;
        this.cwd = cwd;
        this.validator = validator;
        if (!["copilot", "copilot.exe"].includes(basename(executable).toLocaleLowerCase("en-US")))
            throw new Error("Se requiere el ejecutable nativo de Copilot CLI.");
    }
    async execute(request) {
        const payload = JSON.stringify(request.packet);
        if (Buffer.byteLength(payload) > request.packet.limits.max_input_bytes)
            throw new Error("TaskPacket excede el límite antes de invocar al proveedor.");
        const events = [], decoder = new JsonlEventDecoder(request.packet.limits.max_output_bytes);
        const result = await new Promise((resolve, reject) => {
            const child = spawn(this.executable, ["--agent", request.profile, "--model", request.model, "--output-format", "json", "-p", "Lee el TaskPacket desde stdin y devuelve solo AgentResult."], { cwd: this.cwd, shell: false, windowsHide: true, env: restrictedCopilotEnvironment(), stdio: ["pipe", "pipe", "pipe"] });
            let stderr = "", stderrBytes = 0, settled = false;
            const terminate = () => { if (!child.killed)
                child.kill(process.platform === "win32" ? undefined : "SIGTERM"); };
            const timer = setTimeout(terminate, request.timeout_ms);
            request.signal?.addEventListener("abort", terminate, { once: true });
            child.stdout.on("data", (chunk) => { try {
                events.push(...decoder.push(chunk));
            }
            catch (error) {
                terminate();
                reject(error);
            } });
            child.stderr.on("data", (chunk) => { stderrBytes += chunk.byteLength; if (stderrBytes > 32 * 1024)
                terminate();
            else
                stderr += chunk.toString("utf8"); });
            child.once("error", reject);
            child.once("close", (code) => { if (settled)
                return; settled = true; clearTimeout(timer); try {
                events.push(...decoder.finish());
            }
            catch (error) {
                reject(error);
                return;
            } if (request.signal?.aborted)
                reject(new Error("Invocación cancelada."));
            else
                resolve({ code: code ?? 5, stderr }); });
            child.stdin.end(payload, "utf8");
        });
        if (result.code !== 0)
            throw new Error(`Copilot CLI terminó con código ${result.code}: ${sanitizeDiagnostic(result.stderr)}`);
        const final = extractFinalResponse(events);
        const agentResult = parseAndValidateAgentResult(final.response, this.validator, { task_id: request.packet.task_id, role: request.packet.role, facts: request.packet.facts, evidence: request.packet.evidence });
        return { result: agentResult, usage: usageFromProvider(request.packet.run_id, final.usage), model_requested: request.model, model_observed: final.model, sanitized_stderr: sanitizeDiagnostic(result.stderr), exit_code: result.code };
    }
}
function restrictedCopilotEnvironment() { const result = {}; for (const key of ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "GH_TOKEN", "GITHUB_TOKEN"])
    if (process.env[key] !== undefined)
        result[key] = process.env[key]; result.NO_COLOR = "1"; delete result.NODE_OPTIONS; return result; }
//# sourceMappingURL=copilot_cli.js.map