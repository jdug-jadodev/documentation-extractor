import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse, printParseErrorCode, type ParseError } from "jsonc-parser";
import { atomicWrite } from "./platform/fs.js";
import { isContainedPath } from "./platform/paths.js";

export interface WorkspaceFolder { name?: string; path: string; }
export interface WorkspaceDescriptor { folders: WorkspaceFolder[]; settings?: Record<string, unknown>; tasks?: Record<string, unknown>; [key: string]: unknown; }

export async function readWorkspace(path: string): Promise<WorkspaceDescriptor> {
  const raw = await readFile(path, "utf8");
  if (Buffer.byteLength(raw) > 2 * 1024 * 1024) throw new Error("El archivo .code-workspace excede 2 MiB.");
  const errors: ParseError[] = [];
  const value: unknown = parse(raw, errors, { allowTrailingComma: true, disallowComments: false, allowEmptyContent: false });
  if (errors.length > 0) throw new Error(`Workspace JSONC inválido: ${errors.map((error) => `${printParseErrorCode(error.error)}@${error.offset}`).join(", ")}`);
  if (!value || typeof value !== "object" || !Array.isArray((value as WorkspaceDescriptor).folders)) throw new Error("El workspace no contiene folders[].");
  for (const folder of (value as WorkspaceDescriptor).folders) if (!folder || typeof folder.path !== "string" || folder.path.length === 0) throw new Error("Cada carpeta del workspace necesita path.");
  return value as WorkspaceDescriptor;
}

export function workspaceRoots(workspacePath: string, descriptor: WorkspaceDescriptor): string[] {
  const root = dirname(workspacePath);
  return descriptor.folders.map((folder) => resolve(root, folder.path));
}

export function isWorkspaceMember(candidate: string, roots: readonly string[]): boolean {
  return roots.some((root) => isContainedPath(root, candidate));
}

export async function writeManagedWorkspace(path: string, roots: Array<{ name: string; path: string }>, existing?: WorkspaceDescriptor): Promise<void> {
  const value: WorkspaceDescriptor = { ...(existing ?? {}), folders: roots.map((item) => ({ name: item.name, path: item.path })), "docsys.managed": { schema_version: 3 } };
  await atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function reconcileWorkspace(configuredRoots: readonly string[], descriptorRoots: readonly string[]): { allowed: string[]; pending: string[]; missing: string[] } {
  const allowed = configuredRoots.filter((root) => isWorkspaceMember(root, descriptorRoots));
  const pending = descriptorRoots.filter((root) => !isWorkspaceMember(root, configuredRoots));
  const missing = configuredRoots.filter((root) => !isWorkspaceMember(root, descriptorRoots));
  return { allowed, pending, missing };
}
