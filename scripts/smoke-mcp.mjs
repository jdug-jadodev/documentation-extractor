import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { assertNode24, handleScriptError, packageRoot } from "./shared.mjs";

const configIndex = process.argv.indexOf("--config");
const configPath = resolve(configIndex >= 0 && process.argv[configIndex + 1] ? process.argv[configIndex + 1] : join(packageRoot, "knowledge.yaml"));
const runIndex = process.argv.indexOf("--run");
const suppliedRunId = runIndex >= 0 ? process.argv[runIndex + 1] : undefined;

async function main() {
  assertNode24();
  const child = spawn(process.execPath, [join(packageRoot, "scripts", "mcp.mjs"), "--config", configPath], {
    cwd: packageRoot,
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, DOCSYS_DISABLE_NETWORK: "1", DOCSYS_DISABLE_AI: "1" },
  });
  let nextId = 1;
  let stdout = "";
  let stderr = "";
  const pending = new Map();
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-16_384); });
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    while (stdout.includes("\n")) {
      const index = stdout.indexOf("\n");
      const line = stdout.slice(0, index).replace(/\r$/u, "");
      stdout = stdout.slice(index + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      if (message.id === undefined) continue;
      const waiter = pending.get(message.id);
      if (!waiter) continue;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(`MCP ${message.error.code}: ${message.error.message}`)); else waiter.resolve(message.result);
    }
  });
  const request = (method, params = {}, timeoutMs = 10_000) => new Promise((resolveRequest, rejectRequest) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); rejectRequest(new Error(`Tiempo agotado esperando ${method}. ${stderr}`)); }, timeoutMs);
    pending.set(id, { resolve: (value) => { clearTimeout(timer); resolveRequest(value); }, reject: (error) => { clearTimeout(timer); rejectRequest(error); } });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
  const notify = (method, params = {}) => child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  try {
    const initialized = await request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "docsys-smoke", version: "1.0.0" } });
    notify("notifications/initialized");
    const listed = await request("tools/list");
    const status = await request("tools/call", { name: "docsys_status", arguments: {} });
    const repositories = await request("tools/call", { name: "docsys_list_repositories", arguments: {} });
    const names = listed.tools.map((tool) => tool.name).sort();
    const required = ["docsys_explain_relation", "docsys_list_repositories", "docsys_prepare_analysis", "docsys_prepare_documentation", "docsys_prepare_proposal", "docsys_query", "docsys_status", "docsys_trace_flow"].sort();
    if (JSON.stringify(names) !== JSON.stringify(required)) throw new Error(`Superficie MCP inesperada: ${names.join(", ")}`);
    if (status.isError || repositories.isError) throw new Error("Las consultas MCP de solo lectura devolvieron error.");
    const statusValue = status.structuredContent;
    const repositoryValue = repositories.structuredContent;
    if (statusValue?.configuration !== "configured") throw new Error(`Estado inesperado: ${statusValue?.configuration ?? "ausente"}`);
    if (!Array.isArray(repositoryValue?.repositories) || repositoryValue.repositories.length !== 3) throw new Error("MCP no devolvió los tres repositorios configurados.");
    let analysisSummary = { analysis_executed: false };
    if (process.argv.includes("--analyze")) {
      const analysis = await request("tools/call", { name: "docsys_prepare_analysis", arguments: { repositories: repositoryValue.repositories.map((repo) => repo.id) } }, 120_000);
      if (analysis.isError) throw new Error(`El análisis MCP falló: ${analysis.content?.[0]?.text ?? "error no detallado"}`);
      const runId = analysis.structuredContent?.run_id;
      if (typeof runId !== "string") throw new Error("El análisis MCP no devolvió run_id.");
      const endpoints = await request("tools/call", { name: "docsys_query", arguments: { run_id: runId, category: "endpoints", limit: 100 } });
      const relation = await request("tools/call", { name: "docsys_explain_relation", arguments: { run_id: runId, from: "estraviado", to: "login-estraviado" } });
      const flow = await request("tools/call", { name: "docsys_trace_flow", arguments: { run_id: runId, from: "estraviado", to: "login-estraviado" } });
      if (endpoints.isError || relation.isError || flow.isError) throw new Error("Una consulta posterior al análisis MCP devolvió error.");
      analysisSummary = { analysis_executed: true, run_id: runId, extracted_repositories: analysis.structuredContent.repositories, relations: analysis.structuredContent.relations, ai_invocations: analysis.structuredContent.ai_invocations, published: analysis.structuredContent.published, endpoints: endpoints.structuredContent.total, relation_status: relation.structuredContent.status, flow_status: flow.structuredContent.status, flow_paths: flow.structuredContent.paths?.length ?? 0 };
    }
    if (typeof suppliedRunId === "string") {
      if (process.argv.includes("--document")) {
        const documentation = await request("tools/call", { name: "docsys_prepare_documentation", arguments: { run_id: suppliedRunId } }, 120_000);
        if (documentation.isError) throw new Error(`La documentación MCP falló: ${documentation.content?.[0]?.text ?? "error no detallado"}`);
        if (typeof documentation.structuredContent?.obsidian_path !== "string" || documentation.structuredContent?.published !== true) throw new Error("La documentación MCP no produjo una edición final publicada en Obsidian.");
        analysisSummary = { analysis_executed: false, reused_run_id: suppliedRunId, documentation_status: documentation.structuredContent?.status, obsidian_path: documentation.structuredContent?.obsidian_path, documentation_published: documentation.structuredContent?.published, reused_edition: documentation.structuredContent?.reused_edition };
      } else {
      const proposal = await request("tools/call", { name: "docsys_prepare_proposal", arguments: { run_id: suppliedRunId, type: "migration", request: "Separar una capacidad en un microservicio sin modificar las aplicaciones ni inventar infraestructura." } });
      if (proposal.isError) throw new Error(`La propuesta MCP falló: ${proposal.content?.[0]?.text ?? "error no detallado"}`);
      const proposalValue = proposal.structuredContent?.proposal;
      if (!Array.isArray(proposalValue?.tests) || proposalValue.tests.length === 0 || !Array.isArray(proposalValue?.pending_decisions) || proposalValue.pending_decisions.length === 0) throw new Error("La propuesta MCP dejó vacías las pruebas o decisiones pendientes.");
      analysisSummary = { analysis_executed: false, reused_run_id: suppliedRunId, proposal_id: proposal.structuredContent?.proposal_id, proposal_status: proposal.structuredContent?.status, acceptance_criteria: proposalValue.acceptance_criteria?.length ?? 0, tests: proposalValue.tests.length, pending_decisions: proposalValue.pending_decisions.length };
      }
    }
    process.stdout.write(`${JSON.stringify({ protocol: initialized.protocolVersion, server: initialized.serverInfo, tools: names, configuration: statusValue.configuration, repositories: repositoryValue.repositories.map((repo) => repo.id), automatic_analysis: statusValue.automatic_analysis, ...analysisSummary }, null, 2)}\n`);
  } finally {
    child.stdin.end();
    const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
    const timer = setTimeout(() => child.kill(), 2_000);
    await exited;
    clearTimeout(timer);
  }
}

main().catch(handleScriptError);
