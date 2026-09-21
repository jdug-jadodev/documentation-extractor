import test from "node:test";
import assert from "node:assert/strict";
import { buildInventory } from "../src/discovery/inventory.js";
import { MemorySnapshotReader } from "./support/memory-snapshot.js";

test("P25: inventario determinista clasifica sin proveedor", async () => { const inventory = await buildInventory(new MemorySnapshotReader("repo", { "package.json": "{}", "src/a.ts": "export const a = 1", "node_modules/x.js": "secret" })); assert.equal(inventory.repository_id, "repo"); assert.equal(inventory.coverage.discovered, 3); assert.equal(inventory.coverage.excluded, 1); });
test("P26: la ecuación de cobertura es reconciliable", async () => { const { coverage } = await buildInventory(new MemorySnapshotReader("repo", { "a.ts": "x", "a.bin": "x" })); assert.equal(coverage.discovered, coverage.excluded + coverage.eligible); assert.equal(coverage.eligible, coverage.processed + coverage.failed + coverage.unsupported + coverage.not_scanned); });
