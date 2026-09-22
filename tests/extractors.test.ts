import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { buildInventory } from "../src/discovery/inventory.js";
import { createPythonPlugin } from "../src/extractors/python/index.js";
import { createDotnetPlugin } from "../src/extractors/dotnet/index.js";
import { createNodeExpressPlugin } from "../src/extractors/node_express/index.js";
import { MemorySnapshotReader } from "./support/memory-snapshot.js";

const root = process.cwd(); const grammar_root = join(root, "assets", "grammars");
test("P07/P41/N01: FastAPI se extrae como texto sin Python", async () => { const reader = new MemorySnapshotReader("demo", { "app.py": "from fastapi import FastAPI\napp=FastAPI()\n@app.get(\"/x\")\ndef x(): return {}\n" }); const inventory = await buildInventory(reader); const plugin = createPythonPlugin(); const candidates = await plugin.detect(inventory); const result = await plugin.extract(reader, candidates[0]!, { max_file_bytes: 100_000, grammar_root }); assert.equal(result.facts.filter((fact) => fact.kind === "http_endpoint").length, 1); });
test("P36: minimal API .NET conserva método y ruta", async () => { const reader = new MemorySnapshotReader("dotnet", { "Program.cs": "app.MapGet(\"/health\", () => \"ok\");" }); const inventory = await buildInventory(reader); const plugin = createDotnetPlugin(); const result = await plugin.extract(reader, (await plugin.detect(inventory))[0]!, { max_file_bytes: 100_000, grammar_root }); assert.equal(result.facts.some((fact) => fact.kind === "http_endpoint"), true); });

test("Express conserva rutas, montajes y acceso Supabase observables", async () => {
  const reader = new MemorySnapshotReader("express", {
    "package.json": JSON.stringify({ dependencies: { express: "^4.19.0", "@supabase/supabase-js": "^2.0.0" } }),
    "src/index.ts": "import express from 'express'; const app=express(); app.use('/auth', authRoutes); app.get('/health', health); router.post('/login', login); fetch(`${BACKEND_URL}/health`); supabase.from('users').select('*'); supabase.from('tokens').insert({});",
  });
  const inventory = await buildInventory(reader);
  const plugin = createNodeExpressPlugin();
  const candidate = (await plugin.detect(inventory))[0]!;
  const result = await plugin.extract(reader, candidate, { max_file_bytes: 100_000, grammar_root });
  assert.equal(result.facts.filter((fact) => fact.kind === "http_endpoint_fragment").length, 2);
  assert.equal(result.facts.some((fact) => fact.kind === "http_route_mount"), true);
  assert.equal(result.facts.some((fact) => fact.kind === "data_read"), true);
  assert.equal(result.facts.some((fact) => fact.kind === "data_write"), true);
  const fetchFact = result.facts.find((fact) => fact.kind === "http_client_call");
  assert.equal((fetchFact?.value as { method?: string }).method, "GET");
});
