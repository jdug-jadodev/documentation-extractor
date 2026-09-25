import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { applyEdits, modify, parse } from "jsonc-parser";
import { assertSupportedNode, handleScriptError, packageRoot } from "./shared.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function slug(value) {
  const result = value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("en-US").replace(/[^a-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "");
  return result || "repository";
}

function yamlString(value) { return JSON.stringify(value); }

async function put(path, content, force) {
  await mkdir(dirname(path), { recursive: true });
  if (force) return await writeFile(path, content, "utf8");
  try {
    const current = await readFile(path, "utf8");
    if (current === content) return;
    throw Object.assign(new Error(`Ya existe un archivo distinto: ${path}. Revíselo o repita con --force.`), { exitCode: 3 });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await writeFile(path, content, { encoding: "utf8", flag: "wx" });
}

async function copy(source, target, force) {
  await mkdir(dirname(target), { recursive: true });
  try {
    const [a, b] = await Promise.all([readFile(source), readFile(target)]);
    if (a.equals(b)) return;
    if (!force) throw Object.assign(new Error(`Ya existe un archivo distinto: ${target}. Revíselo o repita con --force.`), { exitCode: 3 });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await copyFile(source, target);
}

async function putJsonSetting(path, key, value) {
  await mkdir(dirname(path), { recursive: true });
  let text;
  try { text = await readFile(path, "utf8"); }
  catch (error) { if (error?.code !== "ENOENT") throw error; text = "{}\n"; }
  const edits = modify(text, [key], value, { formattingOptions: { insertSpaces: true, tabSize: 2, eol: "\n" } });
  await writeFile(path, applyEdits(text, edits), "utf8");
}

async function main() {
  assertSupportedNode();
  const workspaceArgument = argument("--workspace");
  const vaultArgument = argument("--vault");
  const integrationOnly = process.argv.includes("--integration-only");
  const portableMcpRequested = process.argv.includes("--portable-mcp");
  if (!workspaceArgument || (!integrationOnly && !vaultArgument)) throw Object.assign(new Error("Uso: pnpm workspace:install -- --workspace <archivo.code-workspace> --vault <bóveda> [--repository-ids id1,id2] [--branch main] [--portable-mcp] [--force] | --workspace <archivo.code-workspace> --integration-only [--portable-mcp] --force"), { exitCode: 2 });
  const workspaceFile = resolve(workspaceArgument);
  const vaultPath = vaultArgument ? resolve(vaultArgument) : null;
  const workspaceRoot = dirname(workspaceFile);
  const configPath = resolve(argument("--config", join(workspaceRoot, "knowledge.yaml")));
  const statePath = resolve(argument("--state", join(packageRoot, ".knowledge", "workspaces", slug(basename(workspaceRoot)))));
  const branch = argument("--branch", "main");
  const force = process.argv.includes("--force");
  let workspaceText = await readFile(workspaceFile, "utf8");
  let descriptor = parse(workspaceText);
  if (!descriptor || !Array.isArray(descriptor.folders) || descriptor.folders.some((folder) => typeof folder?.path !== "string")) throw Object.assign(new Error("El .code-workspace no contiene folders[] válidos."), { exitCode: 2 });
  const hasController = descriptor.folders.some((folder) => resolve(workspaceRoot, folder.path) === workspaceRoot);
  if (!hasController) {
    workspaceText = applyEdits(workspaceText, modify(workspaceText, ["folders", 0], { name: "documentacion-workspace", path: "." }, { isArrayInsertion: true, formattingOptions: { insertSpaces: true, tabSize: 2, eol: "\n" } }));
    descriptor = parse(workspaceText);
  }
  workspaceText = applyEdits(workspaceText, modify(workspaceText, ["settings", "chat.mcp.autostart"], "newAndOutdated", { formattingOptions: { insertSpaces: true, tabSize: 2, eol: "\n" } }));
  await writeFile(workspaceFile, workspaceText, "utf8");
  descriptor = parse(workspaceText);
  const applicationFolders = descriptor.folders.filter((folder) => resolve(workspaceRoot, folder.path) !== workspaceRoot);
  const requestedIds = (argument("--repository-ids", "") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (requestedIds.length > 0 && requestedIds.length !== applicationFolders.length) throw Object.assign(new Error("--repository-ids debe contener un ID por cada repositorio de aplicación del workspace."), { exitCode: 2 });
  const used = new Set();
  const repositories = applicationFolders.map((folder, index) => {
    const root = resolve(workspaceRoot, folder.path);
    const base = requestedIds[index] ?? slug(folder.name ?? basename(root));
    let id = base; let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    return { id, path: root };
  });
  const yaml = vaultPath === null ? null : [
    "schema_version: 3", "setup_status: configured", `workspace_file: ${yamlString(workspaceFile)}`, `vault_path: ${yamlString(vaultPath)}`, `state_path: ${yamlString(statePath)}`, "repositories:",
    ...repositories.flatMap((repo) => [`  - id: ${yamlString(repo.id)}`, `    path: ${yamlString(repo.path)}`, "    enabled: true", `    default_branch: ${yamlString(branch)}`]),
    "documentation:", "  include_tests: false", "documentation_intelligence:", "  enabled: true", "  max_context_tokens: 15000", "  max_documents: 40", "  max_flows: 5", "  max_symbols: 25", "  max_documents_per_repository: 15", "  include_tests_by_default: false", "investigation:", "  max_dependency_depth: 3", "  default_max_files: 8", "  hard_max_files: 20", "  default_max_bytes: 262144", "  hard_max_bytes: 1048576", "  allow_repository_wide_scan: false", "ai:", "  provider: copilot-cli", "  model: null", "  strong_model: null", "  max_invocations: 8", "sharing:", "  mode: local", "azure:", "  enabled: false", "",
  ].join("\n");
  const mcp = `${JSON.stringify({ servers: { "sistema-documentacion": { type: "stdio", command: process.execPath, args: [join(packageRoot, "scripts", "mcp.mjs"), "--config", configPath] } } }, null, 2)}\n`;
  const portableMcp = `${JSON.stringify({ mcpServers: { "sistema-documentacion": { type: "local", command: process.execPath, args: [join(packageRoot, "scripts", "mcp.mjs"), "--config", configPath], env: {}, tools: ["*"] } } }, null, 2)}\n`;
  if (!integrationOnly && yaml !== null) await put(configPath, yaml, force);
  await put(join(workspaceRoot, ".vscode", "mcp.json"), mcp, force);
  await putJsonSetting(join(workspaceRoot, ".vscode", "settings.json"), "chat.mcp.autostart", "newAndOutdated");
  if (portableMcpRequested) await put(join(workspaceRoot, ".mcp.json"), portableMcp, force);
  await copy(join(packageRoot, ".github", "copilot-instructions.md"), join(workspaceRoot, ".github", "copilot-instructions.md"), force);
  await copy(join(packageRoot, ".github", "agents", "orquestador.agent.md"), join(workspaceRoot, ".github", "agents", "orquestador.agent.md"), force);
  await copy(join(packageRoot, ".github", "skills", "archify-documentation", "SKILL.md"), join(workspaceRoot, ".github", "skills", "archify-documentation", "SKILL.md"), force);
  process.stdout.write(`${JSON.stringify({ status: "configured", mode: integrationOnly ? "integration_only" : "full", workspace_file: workspaceFile, controller_folder: workspaceRoot, config_path: configPath, state_path: statePath, vault_path: vaultPath, repositories, vscode_mcp_config: join(workspaceRoot, ".vscode", "mcp.json"), portable_mcp_config: portableMcpRequested ? join(workspaceRoot, ".mcp.json") : null, required_chat_agent: "sistema-documentacion", automatic_analysis: false }, null, 2)}\n`);
}

main().catch(handleScriptError);
