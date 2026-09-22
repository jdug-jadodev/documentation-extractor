import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ContractValidator } from "../src/contracts/validator.js";
import { loadConfiguration, configurationState } from "../src/config.js";

const root = process.cwd();
test("P09: una configuración v3 produce una sola configuración efectiva", async () => {
  const temp = await mkdtemp(join(tmpdir(), "docsys-config-")); const path = join(temp, "knowledge.yaml");
  await writeFile(path, "schema_version: 3\nsetup_status: configuration_pending\nworkspace_file: null\nvault_path: ./boveda\nrepositories: []\nai:\n  provider: copilot-cli\n  model: null\n  strong_model: null\n  max_invocations: 8\nsharing:\n  mode: local\nazure:\n  enabled: false\n");
  const config = await loadConfiguration(path, await ContractValidator.create(root)); assert.equal(await configurationState(config), "configuration_pending"); assert.equal(config.vault_root, join(temp, "boveda"));
});

test("P10: campos desconocidos no sustituyen configuración sana", async () => {
  const temp = await mkdtemp(join(tmpdir(), "docsys-invalid-")); const path = join(temp, "knowledge.yaml");
  await writeFile(path, "schema_version: 3\nunknown: true\n"); await assert.rejects(loadConfiguration(path, await ContractValidator.create(root)));
});
