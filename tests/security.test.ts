import test from "node:test";
import assert from "node:assert/strict";
import { parseManifest } from "../src/extractors/manifests.js";
import { redactText } from "../src/security/redaction.js";

test("P30: XML con DTD se rechaza", () => assert.throws(() => parseManifest('<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]><a>&x;</a>', "xml")));
test("P31: secretos canario se redactan antes de serializar", () => { const value = redactText("password=CANARY token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"); assert.doesNotMatch(value, /CANARY|aaaaaaaaaaaa/u); });
