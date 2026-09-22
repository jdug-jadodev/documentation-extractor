import { readFile, writeFile, mkdir, cp, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { assertSupportedNode, handleScriptError, packageRoot } from "./shared.mjs";

async function main() {
  assertSupportedNode();
  const evidencePath = join(packageRoot, ".knowledge", "test-evidence", "release-approval.json");
  let evidence;
  try { evidence = JSON.parse(await readFile(evidencePath, "utf8")); } catch { throw Object.assign(new Error("No se genera una release sin evidencia de tipos, build y pruebas autorizadas."), { exitCode: 3 }); }
  if (evidence?.approved !== true) throw Object.assign(new Error("La evidencia de release no está aprobada."), { exitCode: 3 });
  const target = join(packageRoot, ".knowledge", "release", "sistema-documentacion-4.0.0");
  await mkdir(target, { recursive: true });
  const entries = ["dist", "scripts", "assets", "schemas", "templates", "agents", ".github/copilot-instructions.md", ".github/agents/orquestador.agent.md", ".github/skills/archify-documentation", "package.json", "package-lock.json", "pnpm-lock.yaml", "README.md", "INICIAR.cmd", "iniciar"];
  const manifest = [];
  for (const entry of entries) {
    await cp(join(packageRoot, entry), join(target, entry), { recursive: true, force: false, errorOnExist: true });
  }
  async function record(path) {
    const data = await readFile(path);
    manifest.push({ path: relative(target, path).replaceAll("\\", "/"), sha256: createHash("sha256").update(data).digest("hex"), size: data.byteLength });
  }
  for (const path of await listFiles(target)) await record(path);
  manifest.sort((a, b) => Buffer.from(a.path).compare(Buffer.from(b.path)));
  await writeFile(join(target, "release-manifest.json"), JSON.stringify({ schema_version: 3, node: process.versions.node, files: manifest }, null, 2) + "\n", "utf8");
}

async function listFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

main().catch(handleScriptError);
