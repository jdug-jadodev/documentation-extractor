import test from "node:test";
import assert from "node:assert/strict";
import { branchKey, isContainedPath } from "../src/platform/paths.js";
import { reconcileWorkspace } from "../src/workspace.js";

test("P15/P16: la intersección workspace-autorización prevalece", () => { const result = reconcileWorkspace(["/work/a"], ["/work/a", "/work/b"]); assert.deepEqual(result.allowed, ["/work/a"]); assert.deepEqual(result.pending, ["/work/b"]); });
test("P18/N08: contención usa segmentos y no prefijos", () => { assert.equal(isContainedPath("/work/app", "/work/application"), false); assert.equal(isContainedPath("/work/app", "/work/app/src"), true); });
test("P89: claves de ramas portables conservan colisiones separadas", () => { assert.notEqual(branchKey("feature/a"), branchKey("feature-a")); assert.notEqual(branchKey("CON"), branchKey("con/")); });
