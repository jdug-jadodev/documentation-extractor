import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { buildInventory } from "../src/discovery/inventory.js";
import { createPythonPlugin } from "../src/extractors/python/index.js";
import { createDotnetPlugin } from "../src/extractors/dotnet/index.js";
import { createNodeExpressPlugin } from "../src/extractors/node_express/index.js";
import { createSourceArchitecturePlugin } from "../src/extractors/source_architecture/index.js";
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

test("la arquitectura fuente conserva módulos, símbolos, imports, tecnologías y scripts", async () => {
  const reader = new MemorySnapshotReader("architecture", {
    "package.json": JSON.stringify({ packageManager: "pnpm@10", engines: { node: ">=20" }, scripts: { build: "tsc" }, dependencies: { express: "^4.19.0", zod: "^3.0.0" }, devDependencies: { typescript: "^6.0.0" } }),
    "src/application/usecase/LoginUseCase.ts": "export class LoginUseCase {\n  async execute(email: string) { return this.validate(email); }\n  private validate(email: string) { return Boolean(email); }\n}",
    "src/infrastructure/routes/auth.routes.ts": "import { LoginUseCase } from '../../application/usecase/LoginUseCase'; export function createAuthRouter() { return LoginUseCase; }",
    "src/utils/hash.ts": "export const hashPassword = async (value: string) => value;"
  });
  const plugin = createSourceArchitecturePlugin();
  const candidate = (await plugin.detect(await buildInventory(reader)))[0]!;
  const result = await plugin.extract(reader, candidate, { max_file_bytes: 100_000, grammar_root });
  assert.equal(result.facts.filter((fact) => fact.kind === "source_module").length, 3);
  assert.equal(result.facts.some((fact) => fact.kind === "code_symbol" && (fact.value as { name?: string }).name === "LoginUseCase"), true);
  const execute = result.facts.find((fact) => fact.kind === "code_symbol" && (fact.value as { name?: string }).name === "execute");
  assert.equal((execute?.value as { class_name?: string }).class_name, "LoginUseCase");
  assert.deepEqual((execute?.value as { calls?: string[] }).calls, ["validate"]);
  assert.match(String((execute?.value as { description?: string }).description), /Procesa/u);
  assert.equal(result.facts.some((fact) => fact.kind === "module_dependency" && (fact.value as { target_path?: string }).target_path === "src/application/usecase/LoginUseCase.ts"), true);
  assert.equal(result.facts.filter((fact) => fact.kind === "package_dependency").length, 3);
  assert.equal(result.facts.some((fact) => fact.kind === "build_script"), true);
});
