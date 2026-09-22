import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { assertSupportedNode, exists, handleScriptError, packageRoot } from "./shared.mjs";

async function main() {
  assertSupportedNode();
  const modulePath = join(packageRoot, "dist", "mcp.js");
  if (!(await exists(modulePath))) throw Object.assign(new Error("Release incompleta: falta dist/mcp.js. Ejecuta el build explícitamente como desarrollador."), { exitCode: 2 });
  const configIndex = process.argv.indexOf("--config");
  const configPath = configIndex >= 0 && process.argv[configIndex + 1] ? process.argv[configIndex + 1] : join(packageRoot, "knowledge.yaml");
  const module = await import(pathToFileURL(modulePath).href);
  await module.serveDocumentationMcp({ packageRoot, configPath });
}

main().catch(handleScriptError);
