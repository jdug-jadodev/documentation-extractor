import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseDocument } from "yaml";
import { saveConfiguration, type KnowledgeConfiguration, type RepositoryConfiguration } from "./config.js";
import type { ContractValidator } from "./contracts/validator.js";
import { atomicWrite } from "./platform/fs.js";
import { contentHash } from "./platform/hash.js";

export interface MigrationDecision { source: string; source_key: string; destination_key: string; decision: "migrate" | "historical" | "credential" | "conflict"; value: unknown; }
export interface MigrationPlan { schema_version: 3; source_path: string; source_hash: string; target: KnowledgeConfiguration; decisions: MigrationDecision[]; conflicts: string[]; }

export async function planLegacyMigration(manifestInput: string): Promise<MigrationPlan> {
  const manifestPath = resolve(manifestInput);
  const raw = await readFile(manifestPath, "utf8");
  const document = parseDocument(raw, { strict: true });
  if (document.errors.length > 0) throw new Error(`Manifiesto heredado inválido: ${document.errors.map((error) => error.message).join("; ")}`);
  const legacy = document.toJS() as { repositories?: Array<Record<string, unknown>> };
  const decisions: MigrationDecision[] = [];
  const conflicts: string[] = [];
  const repositories: RepositoryConfiguration[] = [];
  for (const [index, item] of (legacy.repositories ?? []).entries()) {
    const id = typeof item.name === "string" ? item.name : `repository-${index}`;
    const path = typeof item.path === "string" ? item.path : "";
    const enabled = item.enabled === true;
    const defaultBranch = typeof item.branch === "string" ? item.branch : null;
    if (!path) conflicts.push(`repositories[${index}].path ausente`);
    repositories.push({ id, path, enabled, default_branch: defaultBranch });
    for (const [sourceKey, destinationKey, value] of [["name", "id", id], ["path", "path", path], ["enabled", "enabled", enabled], ["branch", "default_branch", defaultBranch]] as const) {
      decisions.push({ source: manifestPath, source_key: `repositories[${index}].${sourceKey}`, destination_key: `repositories[${index}].${destinationKey}`, decision: "migrate", value });
    }
    if (item.url !== undefined) decisions.push({ source: manifestPath, source_key: `repositories[${index}].url`, destination_key: "migration_history.remote_url", decision: "historical", value: "[redacted]" });
  }
  const target: KnowledgeConfiguration = { schema_version: 3, setup_status: "configuration_pending", workspace_file: null, vault_path: "./boveda", repositories, ai: { provider: "copilot-cli", model: null, strong_model: null, max_invocations: 8 }, sharing: { mode: "local" }, azure: { enabled: false } };
  return { schema_version: 3, source_path: manifestPath, source_hash: contentHash(raw), target, decisions, conflicts };
}

export async function applyLegacyMigration(options: { projectRoot: string; configPath: string; plan: MigrationPlan; validator: ContractValidator }): Promise<string> {
  const { projectRoot, configPath, plan, validator } = options;
  if (plan.conflicts.length > 0) throw new Error(`La migración tiene conflictos: ${plan.conflicts.join("; ")}`);
  const migrationRoot = join(projectRoot, ".knowledge", "migrations", plan.source_hash.slice(0, 16));
  await mkdir(migrationRoot, { recursive: true });
  await copyFile(plan.source_path, join(migrationRoot, "workspace-repos.yaml.original"));
  await copyFile(configPath, join(migrationRoot, "knowledge.yaml.before"));
  await saveConfiguration(configPath, plan.target, validator);
  const receiptPath = join(migrationRoot, "receipt.json");
  await atomicWrite(receiptPath, `${JSON.stringify({ ...plan, config_path: resolve(configPath), applied_at: new Date().toISOString(), rollback_source: "knowledge.yaml.before" }, null, 2)}\n`);
  return receiptPath;
}

export async function restoreLegacyConfiguration(destinationPath: string, receiptPath: string): Promise<void> {
  const root = resolve(dirname(receiptPath));
  await copyFile(join(root, "knowledge.yaml.before"), resolve(destinationPath));
}
