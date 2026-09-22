import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAutomaticPublicationReceipt, validateApprovalReceipt } from "../src/review/approval.js";
import { LocalPublicationTarget } from "../src/publication/local.js";

test("la autorización automática fija los hashes y se invalida al cambiar contenido", async () => { const root = await mkdtemp(join(tmpdir(), "docsys-publication-")); await mkdir(join(root, "Servicios")); await writeFile(join(root, "Inicio.md"), "# Inicio\n"); const receipt = await createAutomaticPublicationReceipt({ runId: "run-x", candidateRoot: root, scope: ["run-x"] }); assert.equal(receipt.actor, "docsys:auto-publication"); await writeFile(join(root, "Inicio.md"), "# Cambió\n"); await assert.rejects(validateApprovalReceipt(receipt, root)); });

test("la publicación conserva solo la edición vigente y reemplaza Actual", async () => {
  const temp = await mkdtemp(join(tmpdir(), "docsys-retention-")), candidate = join(temp, "candidate"), vault = join(temp, "vault");
  await mkdir(candidate); await writeFile(join(candidate, "Inicio.md"), "# Primera\n");
  const target = new LocalPublicationTarget(vault, "test");
  const first = await target.publish(candidate, await createAutomaticPublicationReceipt({ runId: "run-first", candidateRoot: candidate, scope: ["run-first"] }), {});
  await writeFile(join(candidate, "Inicio.md"), "# Segunda\n");
  const second = await target.publish(candidate, await createAutomaticPublicationReceipt({ runId: "run-second", candidateRoot: candidate, scope: ["run-second"] }), {});
  assert.deepEqual((await readdir(join(vault, "Publicaciones"))).sort(), [second.edition_id]);
  assert.notEqual(first.edition_id, second.edition_id);
  assert.equal(await readFile(join(vault, "Actual", "Inicio.md"), "utf8"), "# Segunda\n");
});
