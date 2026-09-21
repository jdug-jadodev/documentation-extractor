import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { assertNode24, exists, handleScriptError, packageRoot } from "./shared.mjs";

async function main() {
  assertNode24();
  const distCli = join(packageRoot, "dist", "cli.js");
  if (!(await exists(distCli))) throw Object.assign(new Error("Release incompleta: falta dist/cli.js. Ejecuta el build explícitamente como desarrollador."), { exitCode: 2 });
  const module = await import(pathToFileURL(distCli).href);
  process.exitCode = await module.runCli(process.argv.slice(2), { packageRoot });
}

main().catch(handleScriptError);
