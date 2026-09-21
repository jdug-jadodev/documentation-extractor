import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApprovalReceipt, validateApprovalReceipt } from "../src/review/approval.js";

test("P76/P77: aprobación exige acción humana y se invalida al cambiar contenido", async () => { const root = await mkdtemp(join(tmpdir(), "docsys-approval-")); await mkdir(join(root, "Servicios")); await writeFile(join(root, "Inicio.md"), "# Inicio\n"); await assert.rejects(createApprovalReceipt({ runId: "run-x", candidateRoot: root, actor: "a", scope: [], humanAction: false })); const receipt = await createApprovalReceipt({ runId: "run-x", candidateRoot: root, actor: "a", scope: [], humanAction: true }); await writeFile(join(root, "Inicio.md"), "# Cambió\n"); await assert.rejects(validateApprovalReceipt(receipt, root)); });
