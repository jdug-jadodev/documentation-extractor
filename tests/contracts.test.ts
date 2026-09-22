import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ContractValidator, ContractValidationError } from "../src/contracts/validator.js";
import { ACCEPTANCE_CASES } from "./acceptance-catalog.js";

const root = process.cwd();

test("P05/N14: contratos v3 válidos y campos desconocidos rechazados", async () => {
  const validator = await ContractValidator.create(root);
  const valid = { schema_version: 3, id: "s1", repository_id: "repo", requested_ref: "master", resolved_ref: "a".repeat(40), commit_oid: "a".repeat(40), capture_mode: "git", content_hash: "b".repeat(64), dirty: false, captured_at: "2026-09-21T00:00:00.000Z" };
  assert.doesNotThrow(() => validator.assert("snapshot", valid));
  assert.throws(() => validator.assert("snapshot", { ...valid, extra: true }), ContractValidationError);
});

test("P01-P112 y N01-N16 están catalogadas sin duplicados", () => {
  assert.equal(ACCEPTANCE_CASES.length, 128);
  assert.equal(new Set(ACCEPTANCE_CASES.map((item) => item.id)).size, 128);
  assert.equal(ACCEPTANCE_CASES[0]?.id, "P01"); assert.equal(ACCEPTANCE_CASES[111]?.id, "P112"); assert.equal(ACCEPTANCE_CASES[127]?.id, "N16");
});
