import test from "node:test";
import assert from "node:assert/strict";
import { parseManifest } from "../src/extractors/manifests.js";
import { buildBundle } from "../src/bundles.js";
import type { ExtractionResult, Snapshot } from "../src/contracts/types.js";
import { redactText, redactValue } from "../src/security/redaction.js";

test("P30: XML con DTD se rechaza", () => assert.throws(() => parseManifest('<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]><a>&x;</a>', "xml")));
test("P31: secretos canario se redactan antes de serializar", () => { const value = redactText("password=CANARY token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"); assert.doesNotMatch(value, /CANARY|aaaaaaaaaaaa/u); });

test("P31: redacta secretos comunes en estructuras anidadas", () => {
  const value = redactValue({ authorization: "Bearer abcdefghijklmnopqrstuvwxyz", nested: { connection: "postgres://alice:super-secret@database.internal/app" }, source: "api_key='CANARY VALUE'" });
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /abcdefghijklmnopqrstuvwxyz|super-secret|CANARY VALUE/u);
  assert.match(serialized, /REDACTED/u);
});

test("P31: el bundle central nunca persiste valores sensibles de un plugin", () => {
  const snapshot: Snapshot = { schema_version: 3, id: "snapshot-demo", repository_id: "demo", requested_ref: "main", resolved_ref: "main", commit_oid: "a".repeat(40), capture_mode: "git", content_hash: "b".repeat(64), dirty: false, captured_at: "2026-09-23T00:00:00.000Z" };
  const result: ExtractionResult = {
    plugin_id: "unsafe-test", plugin_version: "1",
    facts: [{ schema_version: 3, id: "fact-original", kind: "configuration", component_id: "demo", value: { snippet: "password=CANARY", token: "ghp_abcdefghijklmnopqrstuvwxyz123456" }, evidence_ids: ["evidence-demo"], rule_id: "test" }],
    evidence: [{ schema_version: 3, id: "evidence-demo", repository_id: "demo", snapshot_id: snapshot.id, relative_path: "application.yml", source_hash: "c".repeat(64), locator: { kind: "lines", start: 1, end: 1 }, rule_id: "test" }],
    diagnostics: [{ schema_version: 3, id: "diagnostic-original", severity: "warning", code: "TEST", scope: "demo", message: "Authorization: Bearer abcdefghijklmnopqrstuvwxyz", evidence_ids: [], suggested_action: "Remove token=CANARY" }],
    coverage_by_capability: [{ capability: "test", status: "implemented", processed: 1, failed: 0, limitations: ["password=CANARY"] }], dependencies: [],
  };
  const bundle = buildBundle(snapshot, [result], { discovered: 1, excluded: 0, eligible: 1, processed: 1, failed: 0, unsupported: 0, not_scanned: 0, capabilities: [], exclusion_reasons: {} });
  const serialized = JSON.stringify(bundle);
  assert.doesNotMatch(serialized, /CANARY|abcdefghijklmnopqrstuvwxyz123456/u);
  assert.match(serialized, /REDACTED/u);
  assert.notEqual(bundle.facts[0]?.id, "fact-original");
});
