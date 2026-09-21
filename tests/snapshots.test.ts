import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemorySnapshotReader } from "./support/memory-snapshot.js";
import { WorkingTreeSnapshotReader } from "../src/snapshots/working_tree.js";

test("P20: un SnapshotReader no sustituye una ruta ausente", async () => { const reader = new MemorySnapshotReader("repo", { "a.ts": "const a = 1;" }); await assert.rejects(reader.read("missing.ts")); });
test("P21: las rutas con traversal son inaccesibles", async () => { const reader = new MemorySnapshotReader("repo", { "a.ts": "x" }); await assert.rejects(reader.read("../a.ts")); });

test("P23: una selección local queda aislada y marcada dirty", async () => {
  const root = await mkdtemp(join(tmpdir(), "docsys-working-"));
  try {
    await writeFile(join(root, "local.ts"), "export const local = true;\n", "utf8");
    const reader = await WorkingTreeSnapshotReader.capture({ root, repositoryId: "repo", baseCommit: "a".repeat(40), paths: ["local.ts"] });
    assert.equal(reader.snapshot.capture_mode, "working_tree");
    assert.equal(reader.snapshot.dirty, true);
    assert.deepEqual((await reader.list()).map((entry) => entry.relative_path), ["local.ts"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("P24: una captura local rechaza nombres sensibles antes de leerlos", async () => {
  await assert.rejects(WorkingTreeSnapshotReader.capture({ root: process.cwd(), repositoryId: "repo", baseCommit: "b".repeat(40), paths: [".env"] }), /sensible/u);
});
