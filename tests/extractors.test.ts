import test from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildInventory } from "../src/discovery/inventory.js";
import { createPythonPlugin } from "../src/extractors/python/index.js";
import { createDotnetPlugin } from "../src/extractors/dotnet/index.js";
import { MemorySnapshotReader } from "./support/memory-snapshot.js";

const root = dirname(dirname(fileURLToPath(import.meta.url))); const grammar_root = join(root, "assets", "grammars");
test("P07/P41/N01: FastAPI se extrae como texto sin Python", async () => { const reader = new MemorySnapshotReader("demo", { "app.py": "from fastapi import FastAPI\napp=FastAPI()\n@app.get(\"/x\")\ndef x(): return {}\n" }); const inventory = await buildInventory(reader); const plugin = createPythonPlugin(); const candidates = await plugin.detect(inventory); const result = await plugin.extract(reader, candidates[0]!, { max_file_bytes: 100_000, grammar_root }); assert.equal(result.facts.filter((fact) => fact.kind === "http_endpoint").length, 1); });
test("P36: minimal API .NET conserva método y ruta", async () => { const reader = new MemorySnapshotReader("dotnet", { "Program.cs": "app.MapGet(\"/health\", () => \"ok\");" }); const inventory = await buildInventory(reader); const plugin = createDotnetPlugin(); const result = await plugin.extract(reader, (await plugin.detect(inventory))[0]!, { max_file_bytes: 100_000, grammar_root }); assert.equal(result.facts.some((fact) => fact.kind === "http_endpoint"), true); });
