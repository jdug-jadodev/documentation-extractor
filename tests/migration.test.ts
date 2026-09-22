import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ContractValidator } from "../src/contracts/validator.js";
import { applyLegacyMigration, planLegacyMigration, restoreLegacyConfiguration } from "../src/migration.js";

const packageRoot = process.cwd();
const cleanConfig = "schema_version: 3\nsetup_status: configuration_pending\nworkspace_file: null\nvault_path: ./boveda\nrepositories: []\nai:\n  provider: copilot-cli\n  model: null\n  strong_model: null\n  max_invocations: 8\nsharing:\n  mode: local\nazure:\n  enabled: false\n";

test("P11: migración explícita produce recibo y revierte la configuración", async () => {
  const root = await mkdtemp(join(tmpdir(), "docsys-migration-"));
  try {
    const configPath = join(root, "knowledge.yaml");
    const legacyPath = join(root, "legacy.yaml");
    await writeFile(configPath, cleanConfig, "utf8");
    await writeFile(legacyPath, "repositories:\n  - name: servicio\n    path: ../servicio\n    enabled: false\n    branch: main\n", "utf8");
    const plan = await planLegacyMigration(legacyPath);
    const receipt = await applyLegacyMigration({ projectRoot: root, configPath, plan, validator: await ContractValidator.create(packageRoot) });
    assert.match(await readFile(configPath, "utf8"), /id: "servicio"/u);
    await restoreLegacyConfiguration(configPath, receipt);
    assert.equal(await readFile(configPath, "utf8"), cleanConfig);
  } finally { await rm(root, { recursive: true, force: true }); }
});
