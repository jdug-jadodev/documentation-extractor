import { rm } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { assertSupportedNode, handleScriptError, packageRoot } from "./shared.mjs";

async function run(program, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(program, args, { cwd: packageRoot, shell: false, stdio: "inherit", env: { ...process.env, DOCSYS_TEST_MODE: "1", DOCSYS_DISABLE_NETWORK: "1", DOCSYS_DISABLE_AI: "1" } });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`La suite terminó con código ${code ?? "desconocido"}.`)));
  });
}

async function main() {
  assertSupportedNode();
  const output = join(packageRoot, ".knowledge", "test-dist");
  await rm(output, { recursive: true, force: true });
  await run(process.execPath, [join(packageRoot, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.test.json"]);
  const testFiles = [
    "contracts.test.js", "config.test.js", "config-state.test.js", "migration.test.js", "workspace.test.js", "snapshots.test.js", "inventory.test.js",
    "extractors.test.js", "refresh.test.js", "correlation.test.js", "run-services.test.js", "intelligence.test.js", "proposal.test.js", "multi-repository-contract.test.js", "ai.test.js", "documentation.test.js", "publication.test.js", "cli.test.js", "security.test.js"
  ].map((name) => join(output, "tests", name));
  await run(process.execPath, ["--test", ...testFiles]);
}

main().catch(handleScriptError);
