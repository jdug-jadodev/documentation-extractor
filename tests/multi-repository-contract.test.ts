import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

test("el contrato MCP expone acciones bajo demanda y documenta con publicación automática", async () => {
  const source = await readFile(join(process.cwd(), "src", "mcp.ts"), "utf8");
  for (const name of ["docsys_status", "docsys_prepare_analysis", "docsys_explain_relation", "docsys_trace_flow", "docsys_query", "docsys_prepare_proposal", "docsys_prepare_documentation"]) assert.match(source, new RegExp(`registerTool\\("${name}"`, "u"));
  assert.doesNotMatch(source, /registerTool\("docsys_(approve|publish)/u);
  assert.match(source, /prepareAndPublishDocumentation/u);
});
