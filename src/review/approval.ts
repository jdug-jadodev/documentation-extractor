import { readdir, readFile, lstat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { ApprovalReceipt } from "../contracts/types.js";
import { contentHash, sha256, compareBytes } from "../platform/hash.js";

export async function createAutomaticPublicationReceipt(input: { runId: string; candidateRoot: string; scope: string[]; exceptions?: string[] }): Promise<ApprovalReceipt> {
  const fileHashes = await hashCandidateFiles(input.candidateRoot);
  return { schema_version: 3, run_id: input.runId, actor: "docsys:auto-publication", approved_at: new Date().toISOString(), scope: [...input.scope], content_digest: contentHash(fileHashes), file_hashes: fileHashes, exceptions: [...(input.exceptions ?? [])] };
}

export async function validateApprovalReceipt(receipt: ApprovalReceipt, candidateRoot: string): Promise<void> {
  const current = await hashCandidateFiles(candidateRoot);
  if (receipt.content_digest !== contentHash(current)) throw new Error("La autorización de publicación quedó invalidada porque cambió el candidato.");
  if (JSON.stringify(receipt.file_hashes) !== JSON.stringify(current)) throw new Error("Los hashes autorizados ya no coinciden.");
}

export async function hashCandidateFiles(root: string): Promise<Record<string, string>> {
  const files = await walk(root); const result: Record<string, string> = {};
  for (const path of files.sort(compareBytes)) { const portable = relative(root, path).replaceAll("\\", "/"); if (!/\.(?:md|json)$/iu.test(portable)) throw new Error(`Archivo no permitido en candidato: ${portable}`); result[portable] = sha256(await readFile(path)); }
  return result;
}
async function walk(root: string): Promise<string[]> { const result: string[] = []; for (const entry of await readdir(root, { withFileTypes: true })) { const path = join(root, entry.name); const info = await lstat(path); if (info.isSymbolicLink()) throw new Error(`Enlace simbólico rechazado: ${path}`); if (info.isDirectory()) result.push(...await walk(path)); else if (info.isFile()) result.push(path); } return result; }
