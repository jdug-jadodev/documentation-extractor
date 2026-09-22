import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { delimiter, join } from "node:path";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { pathToFileURL } from "node:url";
import { assertSupportedNode, exists, handleScriptError, packageRoot } from "./shared.mjs";

async function installDependencies() {
  const pnpmLock = join(packageRoot, "pnpm-lock.yaml");
  const npmLock = join(packageRoot, "package-lock.json");
  const usePnpm = await exists(pnpmLock) && await commandAvailable(process.platform === "win32" ? "pnpm.cmd" : "pnpm");
  const executable = usePnpm ? "pnpm" : process.platform === "win32" ? "npm.cmd" : "npm";
  const args = usePnpm
    ? ["install", "--prod", "--frozen-lockfile", "--ignore-scripts"]
    : ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"];
  await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: packageRoot, shell: false, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`La instalación terminó con código ${code ?? "desconocido"}.`)));
  });
  if (!(await exists(npmLock)) && !(await exists(pnpmLock))) throw new Error("La release no incluye un lockfile verificable.");
}

async function main() {
  assertSupportedNode();
  const distCli = join(packageRoot, "dist", "cli.js");
  if (!(await exists(distCli))) throw Object.assign(new Error("Release incompleta: falta dist/cli.js. El usuario no debe compilar al iniciar."), { exitCode: 2 });
  const dependencyMarker = join(packageRoot, "node_modules", "ajv", "package.json");
  if (!(await exists(dependencyMarker))) {
    if (process.argv.includes("--no-interactivo") || !stdin.isTTY) {
      throw Object.assign(new Error("Faltan dependencias del motor. Ejecuta pnpm install --prod --frozen-lockfile --ignore-scripts con autorización de red o usa la distribución offline."), { exitCode: 2 });
    }
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question("Faltan dependencias del motor. ¿Instalar con el lockfile (puede usar red autorizada)? [s/N] ");
    rl.close();
    if (!/^s(i)?$/iu.test(answer.trim())) throw Object.assign(new Error("Instalación cancelada; no se modificó ningún repositorio de aplicaciones."), { exitCode: 2 });
    await installDependencies();
  }
  const { runCli } = await import(pathToFileURL(distCli).href);
  process.exitCode = await runCli([]);
}

async function commandAvailable(command) {
  const pathValue = process.env.PATH ?? process.env.Path ?? "";
  for (const directory of pathValue.split(delimiter).filter(Boolean)) {
    try { await access(join(directory, command), constants.X_OK); return true; } catch { /* continuar */ }
  }
  return false;
}

main().catch(handleScriptError);
