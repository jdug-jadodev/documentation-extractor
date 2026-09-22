import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { parseDocument } from "yaml";
import type { ContractValidator } from "./contracts/validator.js";
import { acquireFileLock, atomicWrite } from "./platform/fs.js";
import { isContainedPath } from "./platform/paths.js";

export interface RepositoryConfiguration {
  id: string;
  path: string;
  enabled: boolean;
  default_branch: string | null;
}

export interface KnowledgeConfiguration {
  schema_version: 3;
  setup_status: "configuration_pending" | "configured";
  workspace_file: string | null;
  vault_path: string;
  state_path?: string;
  repositories: RepositoryConfiguration[];
  ai: { provider: "copilot-cli"; model: string | null; strong_model: string | null; max_invocations: number };
  sharing: { mode: "local" | "folder" | "export" };
  azure: { enabled: boolean; repository_url?: string; branch?: string };
  overrides?: Record<string, unknown>;
}

export interface EffectiveConfiguration extends KnowledgeConfiguration {
  config_path: string;
  config_root: string;
  state_root: string;
  workspace_path: string | null;
  vault_root: string;
  repositories: Array<RepositoryConfiguration & { root: string }>;
}

export async function loadConfiguration(path: string, validator: ContractValidator): Promise<EffectiveConfiguration> {
  const configPath = resolve(path);
  const raw = await readFile(configPath, "utf8");
  if (Buffer.byteLength(raw, "utf8") > 1024 * 1024) throw new Error("knowledge.yaml excede el límite de 1 MiB.");
  const document = parseDocument(raw, { prettyErrors: true, strict: true });
  if (document.errors.length > 0) throw new Error(`knowledge.yaml inválido: ${document.errors.map((error) => error.message).join("; ")}`);
  const value: unknown = document.toJS({ maxAliasCount: 20 });
  validator.assert<KnowledgeConfiguration>("config", value);
  const configRoot = dirname(configPath);
  const repositoryIds = new Set<string>();
  const repositories = value.repositories.map((repository) => {
    if (repositoryIds.has(repository.id)) throw new Error(`ID de repositorio duplicado: ${repository.id}`);
    repositoryIds.add(repository.id);
    return { ...repository, root: resolve(configRoot, repository.path) };
  });
  const workspacePath = value.workspace_file === null ? null : resolve(configRoot, value.workspace_file);
  const vaultRoot = resolve(configRoot, value.vault_path);
  const stateRoot = resolve(configRoot, value.state_path ?? ".knowledge");
  validateRootSeparation(configRoot, stateRoot, vaultRoot, repositories.map((item) => item.root));
  return { ...value, config_path: configPath, config_root: configRoot, state_root: stateRoot, workspace_path: workspacePath, vault_root: vaultRoot, repositories };
}

export async function saveConfiguration(path: string, config: KnowledgeConfiguration, validator: ContractValidator): Promise<void> {
  validator.assert<KnowledgeConfiguration>("config", config);
  const lock = await acquireFileLock(`${path}.lock`, { pid: process.pid, operation: "save-config" });
  try {
    const yaml = stringifyConfiguration(config);
    await atomicWrite(path, yaml);
  } finally { await lock.release(); }
}

export function stringifyConfiguration(config: KnowledgeConfiguration): string {
  const lines = [
    "schema_version: 3",
    `setup_status: ${config.setup_status}`,
    `workspace_file: ${config.workspace_file === null ? "null" : yamlString(config.workspace_file)}`,
    `vault_path: ${yamlString(config.vault_path)}`,
    ...(config.state_path === undefined ? [] : [`state_path: ${yamlString(config.state_path)}`]),
    "repositories:",
  ];
  for (const repository of config.repositories) lines.push(`  - id: ${yamlString(repository.id)}`, `    path: ${yamlString(repository.path)}`, `    enabled: ${repository.enabled}`, `    default_branch: ${repository.default_branch === null ? "null" : yamlString(repository.default_branch)}`);
  lines.push("ai:", `  provider: ${config.ai.provider}`, `  model: ${config.ai.model === null ? "null" : yamlString(config.ai.model)}`, `  strong_model: ${config.ai.strong_model === null ? "null" : yamlString(config.ai.strong_model)}`, `  max_invocations: ${config.ai.max_invocations}`, "sharing:", `  mode: ${config.sharing.mode}`, "azure:", `  enabled: ${config.azure.enabled}`);
  if (config.azure.repository_url !== undefined) lines.push(`  repository_url: ${yamlString(config.azure.repository_url)}`);
  if (config.azure.branch !== undefined) lines.push(`  branch: ${yamlString(config.azure.branch)}`);
  if (config.overrides !== undefined) lines.push(`overrides: ${JSON.stringify(config.overrides)}`);
  return `${lines.join("\n")}\n`;
}

export async function configurationState(config: EffectiveConfiguration): Promise<"configuration_pending" | "configured"> {
  if (config.setup_status !== "configured" || config.workspace_path === null) return "configuration_pending";
  try { if (!(await stat(config.workspace_path)).isFile()) return "configuration_pending"; } catch { return "configuration_pending"; }
  return "configured";
}

function validateRootSeparation(configRoot: string, stateRoot: string, vaultRoot: string, repositoryRoots: string[]): void {
  const privateRoots = [stateRoot, resolve(configRoot, "node_modules"), resolve(configRoot, "assets"), resolve(configRoot, "dist")];
  for (const root of [...repositoryRoots, ...privateRoots]) {
    if (isContainedPath(vaultRoot, root) || isContainedPath(root, vaultRoot)) throw new Error(`La boveda se solapa con una raíz privada o de aplicación: ${root}`);
  }
}

function yamlString(value: string): string { return JSON.stringify(value); }

export async function canonicalizeConfiguredRoot(path: string): Promise<string> {
  if (!isAbsolute(path)) throw new Error("La raíz efectiva debe ser absoluta.");
  return await realpath(path);
}
