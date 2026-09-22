import { mkdir, copyFile } from "node:fs/promises";
import { basename, join } from "node:path";

export async function stageProposalDraft(vaultRoot: string, runId: string, proposalId: string, markdownPath: string): Promise<string> {
  if (!/^run-[A-Za-z0-9._-]+$/u.test(runId) || !/^proposal-[A-Za-z0-9._-]+$/u.test(proposalId)) throw new Error("Identificador inválido para borrador de propuesta.");
  const targetRoot = join(vaultRoot, "Borradores", runId, "Propuestas");
  await mkdir(targetRoot, { recursive: true });
  const target = join(targetRoot, `${basename(proposalId)}.md`);
  await copyFile(markdownPath, target);
  return target;
}
