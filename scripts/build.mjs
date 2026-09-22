import { rm, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { assertSupportedNode, handleScriptError, packageRoot } from "./shared.mjs";

async function runNodeScript(script, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: packageRoot, shell: false, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`El compilador terminó con código ${code ?? "desconocido"}.`)));
  });
}

async function main() {
  assertSupportedNode();
  await rm(join(packageRoot, "dist"), { recursive: true, force: true });
  await runNodeScript(join(packageRoot, "node_modules", "typescript", "bin", "tsc"), ["-p", "tsconfig.json"]);
  for (const required of ["schemas/v3/config.schema.json", "templates/asd-tse-100-es.md", ".github/skills/archify-documentation/SKILL.md", "assets/grammars/manifest.json"]) {
    await access(join(packageRoot, required), constants.R_OK);
  }
}

main().catch(handleScriptError);
