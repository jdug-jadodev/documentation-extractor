import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export async function exists(path) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readPackage() {
  return JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
}

export function assertSupportedNode() {
  const major = Number(process.versions.node.split(".")[0]);
  if (!Number.isInteger(major) || major < 20 || major >= 25) {
    const error = new Error(`Se requiere Node.js 20.x–24.x; versión detectada: ${process.versions.node}. En el entorno empresarial usa NVM y ejecuta: nvm use 20`);
    error.exitCode = 2;
    throw error;
  }
}

export function handleScriptError(error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = typeof error?.exitCode === "number" ? error.exitCode : 5;
}
