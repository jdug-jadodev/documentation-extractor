import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "node:util";

test("P92/N16: un modo no interactivo puede representarse sin prompt", () => { const parsed = parseArgs({ args: ["--no-interactivo", "--json"], strict: true, options: { "no-interactivo": { type: "boolean" }, json: { type: "boolean" } } }); assert.equal(parsed.values["no-interactivo"], true); assert.equal(parsed.values.json, true); });
