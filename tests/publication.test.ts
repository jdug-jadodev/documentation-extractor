import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAutomaticPublicationReceipt, validateApprovalReceipt } from "../src/review/approval.js";

test("la autorización automática fija los hashes y se invalida al cambiar contenido", async () => { const root = await mkdtemp(join(tmpdir(), "docsys-publication-")); await mkdir(join(root, "Servicios")); await writeFile(join(root, "Inicio.md"), "# Inicio\n"); const receipt = await createAutomaticPublicationReceipt({ runId: "run-x", candidateRoot: root, scope: ["run-x"] }); assert.equal(receipt.actor, "docsys:auto-publication"); await writeFile(join(root, "Inicio.md"), "# Cambió\n"); await assert.rejects(validateApprovalReceipt(receipt, root)); });
