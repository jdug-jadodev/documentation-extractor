import test from "node:test";
import assert from "node:assert/strict";
import { JsonlEventDecoder, extractFinalResponse } from "../src/ai/jsonl.js";
import { InvocationBudget } from "../src/ai/budget.js";

test("P62/N10: JSONL reconstruye UTF-8 y chunks fragmentados", () => { const decoder = new JsonlEventDecoder(); const bytes = Buffer.from('{"type":"final","content":"sí"}\n', "utf8"); const events = [...decoder.push(bytes.subarray(0, bytes.length - 2)), ...decoder.push(bytes.subarray(bytes.length - 2)), ...decoder.finish()]; assert.equal(extractFinalResponse(events).response, "sí"); });
test("P62: finales duplicados son rechazados", () => assert.throws(() => extractFinalResponse([{ type: "final", content: "a" }, { type: "final", content: "b" }])));
test("P65: presupuesto cuenta reintentos y bloquea el siguiente", () => { const budget = new InvocationBudget({ max_invocations: 1, strong_model: null, strong_authorized: false, allowed_models: ["m"] }); budget.authorize("m", false); assert.throws(() => budget.authorize("m", false)); });
