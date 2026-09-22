import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ContractValidator } from "../src/contracts/validator.js";
import { loadConfiguration } from "../src/config.js";

test("workspace, bóveda y estado privado pueden usar raíces separadas", async () => {
  const configRoot = await mkdtemp(join(tmpdir(), "docsys-separated-"));
  const vault = join(tmpdir(), `docsys-vault-${Date.now()}`);
  const configPath = join(configRoot, "knowledge.yaml");
  const state = join(tmpdir(), `docsys-state-${Date.now()}`);
  await writeFile(configPath, `schema_version: 3\nsetup_status: configuration_pending\nworkspace_file: null\nvault_path: ${JSON.stringify(vault)}\nstate_path: ${JSON.stringify(state)}\nrepositories: []\nai:\n  provider: copilot-cli\n  model: null\n  strong_model: null\n  max_invocations: 8\nsharing:\n  mode: local\nazure:\n  enabled: false\n`);
  const config = await loadConfiguration(configPath, await ContractValidator.create(process.cwd()));
  assert.equal(config.vault_root, vault);
  assert.equal(config.state_root, state);
});
