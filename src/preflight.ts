import { access, lstat, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import { delimiter, extname, isAbsolute, join } from "node:path";
import type { EffectiveConfiguration } from "./config.js";
import { configurationState } from "./config.js";
import { readWorkspace, workspaceRoots, isWorkspaceMember } from "./workspace.js";
import { runRestrictedProcess } from "./platform/process.js";

export interface PreflightIssue { code: string; severity: "blocked" | "warning"; repository_id?: string; message: string; action: string; }
export interface PreflightRepository { id: string; root: string; real_root: string; enabled: boolean; workspace_member: boolean; git_repository: boolean; }
export interface PreflightReport { schema_version: 3; status: "configuration_pending" | "ready" | "blocked"; workspace_membership_verified: boolean; git_executable: string | null; repositories: PreflightRepository[]; issues: PreflightIssue[]; }

export async function preflight(config: EffectiveConfiguration, requestedIds: readonly string[]): Promise<PreflightReport> {
  if (await configurationState(config) === "configuration_pending") return { schema_version: 3, status: "configuration_pending", workspace_membership_verified: false, git_executable: null, repositories: [], issues: [{ code: "CONFIGURATION_PENDING", severity: "blocked", message: "Configuración pendiente", action: "Complete el asistente cuando el workspace de aplicaciones esté disponible." }] };
  if (config.workspace_path === null) throw new Error("Estado inconsistente: workspace ausente.");
  const descriptor = await readWorkspace(config.workspace_path);
  const roots = workspaceRoots(config.workspace_path, descriptor);
  const gitExecutable = await findExecutable(process.platform === "win32" ? ["git.exe"] : ["git"]);
  const repositories: PreflightRepository[] = [];
  const issues: PreflightIssue[] = [];
  const requested = new Set(requestedIds);
  for (const repository of config.repositories) {
    if (!requested.has(repository.id)) continue;
    if (!repository.enabled) { issues.push({ code: "REPOSITORY_DISABLED", severity: "blocked", repository_id: repository.id, message: `Repositorio deshabilitado: ${repository.id}`, action: "Autorícelo desde Configurar; no se leerá mientras tanto." }); continue; }
    let realRoot: string;
    try { realRoot = await realpath(repository.root); } catch { issues.push({ code: "REPOSITORY_MISSING", severity: "blocked", repository_id: repository.id, message: `No existe la copia local autorizada: ${repository.id}`, action: "Proporcione el workspace local sin pedir al motor que clone." }); continue; }
    const member = isWorkspaceMember(realRoot, roots);
    if (!member) { issues.push({ code: "OUTSIDE_WORKSPACE", severity: "blocked", repository_id: repository.id, message: `El repositorio no pertenece al workspace: ${repository.id}`, action: "Reconcilie el descriptor y la autorización." }); repositories.push({ id: repository.id, root: repository.root, real_root: realRoot, enabled: true, workspace_member: false, git_repository: false }); continue; }
    let gitRepository = false;
    if (gitExecutable !== null) {
      const result = await runRestrictedProcess({ executable: gitExecutable, args: ["-C", realRoot, "rev-parse", "--is-inside-work-tree"], cwd: realRoot, timeout_ms: 10_000, max_stdout_bytes: 1024, max_stderr_bytes: 4096, allowed_environment: { GIT_NO_LAZY_FETCH: "1" } });
      gitRepository = result.exit_code === 0 && result.stdout.trim() === "true";
    }
    if (!gitRepository) issues.push({ code: "NOT_GIT_REPOSITORY", severity: "blocked", repository_id: repository.id, message: `Git no reconoce la raíz autorizada: ${repository.id}`, action: "Corrija la ruta; .git puede ser archivo o directorio." });
    repositories.push({ id: repository.id, root: repository.root, real_root: realRoot, enabled: true, workspace_member: true, git_repository: gitRepository });
  }
  if (gitExecutable === null) issues.push({ code: "GIT_NOT_FOUND", severity: "blocked", message: "Git no está disponible.", action: "Instale Git y agréguelo a PATH." });
  return { schema_version: 3, status: issues.some((issue) => issue.severity === "blocked") ? "blocked" : "ready", workspace_membership_verified: true, git_executable: gitExecutable, repositories, issues };
}

export async function findExecutable(names: readonly string[]): Promise<string | null> {
  const path = process.env.PATH ?? process.env.Path ?? "";
  for (const directory of path.split(delimiter)) {
    if (!directory) continue;
    for (const name of names) {
      if (process.platform === "win32" && ![".exe", ".com"].includes(extname(name).toLocaleLowerCase("en-US"))) continue;
      const candidate = isAbsolute(name) ? name : join(directory, name);
      try { await access(candidate, constants.X_OK); return candidate; } catch { /* continue */ }
    }
  }
  return null;
}
