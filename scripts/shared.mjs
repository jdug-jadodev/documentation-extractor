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

export function assertNode24() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major !== 24) {
    const error = new Error(`Se requiere Node.js 24.x; versión detectada: ${process.versions.node}. Usa NVM y ejecuta: nvm use 24.21.0`);
    error.exitCode = 2;
    throw error;
  }
}

export function handleScriptError(error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = typeof error?.exitCode === "number" ? error.exitCode : 5;
}
