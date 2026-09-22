import { join } from "node:path";
import { spawn } from "node:child_process";
import { assertSupportedNode, handleScriptError, packageRoot } from "./shared.mjs";

async function compile(project) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(packageRoot, "node_modules", "typescript", "bin", "tsc"), "-p", project, "--noEmit"], { cwd: packageRoot, shell: false, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`TypeScript (${project}) terminó con código ${code ?? "desconocido"}.`)));
  });
}

async function main() {
  assertSupportedNode();
  await compile("tsconfig.json");
  await compile("tsconfig.test.json");
}

main().catch(handleScriptError);
