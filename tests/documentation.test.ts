import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentModel, ASD_SECTIONS } from "../src/documentation/model.js";
import { renderDocument } from "../src/documentation/render.js";

test("P69/P70: ASD conserva secciones y fallback honesto", () => { const model = createDocumentModel({ runId: "run-x", title: "Demo", snapshots: [], facts: [], graph: { schema_version: 3, scenario_id: "s", snapshot_ids: [], nodes: [], edges: [] }, archifyAvailable: false }); assert.equal(model.sections.length, ASD_SECTIONS.length); assert.equal(model.archify.status, "unavailable"); assert.match(renderDocument(model), /Desconocido/u); });
