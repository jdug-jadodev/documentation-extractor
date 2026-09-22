import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { assertSupportedNode, handleScriptError, packageRoot } from "./shared.mjs";

async function main() {
  assertSupportedNode();
  const module = await import(pathToFileURL(join(packageRoot, "dist", "ai", "profiles.js")).href);
  const model = process.argv[2];
  if (!model) throw Object.assign(new Error("Indica un modelo explícito: pnpm profiles <modelo>"), { exitCode: 2 });
  await module.generateEffectiveProfiles({ packageRoot, model });
}

main().catch(handleScriptError);
