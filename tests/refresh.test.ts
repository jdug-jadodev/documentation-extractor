import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { ContractValidator } from "../src/contracts/validator.js";
import { refreshKnowledge } from "../src/refresh.js";

const execute = promisify(execFile);
const packageRoot = process.cwd();

test("la sincronización reutiliza archivos intactos y no crea otro run sin cambios", async () => {
  const root = await mkdtemp(join(tmpdir(), "docsys-refresh-"));
  const remote = join(root, "remote.git"), source = join(root, "source"), workspace = join(root, "workspace"), repository = join(workspace, "service");
  await mkdir(source); await mkdir(workspace);
  await git(root, ["init", "--bare", "--initial-branch=main", remote]);
  await git(source, ["init", "--initial-branch=main"]);
  await mkdir(join(source, "src"));
  await writeFile(join(source, "src", "changed.ts"), "export class Changed {\n  value() { return 1; }\n}\n");
  await writeFile(join(source, "src", "untouched.ts"), "export const untouched = () => 1;\n");
  await git(source, ["add", "."]); await commit(source, "base");
  await git(source, ["remote", "add", "origin", remote]); await git(source, ["push", "-u", "origin", "main"]);
  await git(workspace, ["clone", remote, repository]);
  const workspaceFile = join(workspace, "team.code-workspace"), configPath = join(workspace, "knowledge.yaml");
  await writeFile(workspaceFile, `${JSON.stringify({ folders: [{ path: "service" }] })}\n`);
  await writeFile(configPath, configuration());
  const validator = await ContractValidator.create(packageRoot);
  const first = await refreshKnowledge({ packageRoot, configPath, validator, syncRemote: false, publish: false });
  assert.equal(first.status, "updated");
  assert.equal(first.repositories[0]?.update_mode, "full");

  await writeFile(join(source, "src", "changed.ts"), "export class Changed {\n  value() { return 2; }\n  added() { return true; }\n}\n");
  await git(source, ["add", "."]); await commit(source, "change one class"); await git(source, ["push", "origin", "main"]);
  const second = await refreshKnowledge({ packageRoot, configPath, validator, publish: false });
  assert.equal(second.status, "updated");
  assert.equal(second.repositories[0]?.pulled, true);
  assert.equal(second.repositories[0]?.update_mode, "incremental");
  assert.deepEqual(second.repositories[0]?.changed_paths, ["src/changed.ts"]);
  assert.deepEqual(second.repositories[0]?.reprocessed_paths, ["src/changed.ts"]);
  assert.equal(second.repositories[0]?.reused_files, 1);
  const facts = JSON.parse(await readFile(join(workspace, "state", "runs", second.run_id, "service", "facts", "all.json"), "utf8")) as Array<{ kind: string; value: { name?: string } }>;
  assert.equal(facts.some((fact) => fact.kind === "code_symbol" && fact.value.name === "added"), true);

  await git(source, ["rm", "src/untouched.ts"]); await commit(source, "remove old source"); await git(source, ["push", "origin", "main"]);
  const third = await refreshKnowledge({ packageRoot, configPath, validator, publish: false });
  assert.equal(third.status, "updated");
  assert.deepEqual(third.repositories[0]?.changed_paths, ["src/untouched.ts"]);
  const afterDeletion = JSON.parse(await readFile(join(workspace, "state", "runs", third.run_id, "service", "facts", "all.json"), "utf8")) as Array<{ kind: string; value: { name?: string } }>;
  assert.equal(afterDeletion.some((fact) => fact.kind === "code_symbol" && fact.value.name === "untouched"), false);

  const fourth = await refreshKnowledge({ packageRoot, configPath, validator, publish: false });
  assert.equal(fourth.status, "unchanged");
  assert.equal(fourth.run_id, third.run_id);
});

test("la sincronización rechaza un pull con trabajo local sin commit", async () => {
  const root = await mkdtemp(join(tmpdir(), "docsys-refresh-dirty-"));
  const remote = join(root, "remote.git"), source = join(root, "source"), workspace = join(root, "workspace"), repository = join(workspace, "service");
  await mkdir(source); await mkdir(workspace);
  await git(root, ["init", "--bare", "--initial-branch=main", remote]);
  await git(source, ["init", "--initial-branch=main"]); await writeFile(join(source, "app.ts"), "export const app = 1;\n");
  await git(source, ["add", "."]); await commit(source, "base"); await git(source, ["remote", "add", "origin", remote]); await git(source, ["push", "-u", "origin", "main"]);
  await git(workspace, ["clone", remote, repository]);
  await writeFile(join(workspace, "team.code-workspace"), `${JSON.stringify({ folders: [{ path: "service" }] })}\n`); await writeFile(join(workspace, "knowledge.yaml"), configuration());
  await writeFile(join(repository, "app.ts"), "export const app = 2;\n");
  await assert.rejects(refreshKnowledge({ packageRoot, configPath: join(workspace, "knowledge.yaml"), validator: await ContractValidator.create(packageRoot), publish: false }), /cambios locales sin commit/u);
});

async function git(cwd: string, args: string[]): Promise<void> { await execute("git", args, { cwd, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } }); }
async function commit(cwd: string, message: string): Promise<void> { await git(cwd, ["-c", "user.name=Docsys Test", "-c", "user.email=docsys@example.invalid", "commit", "-m", message]); }
function configuration(): string { return "schema_version: 3\nsetup_status: configured\nworkspace_file: ./team.code-workspace\nvault_path: ./vault\nstate_path: ./state\nrepositories:\n  - id: service\n    path: ./service\n    enabled: true\n    default_branch: main\nai:\n  provider: copilot-cli\n  model: null\n  strong_model: null\n  max_invocations: 8\nsharing:\n  mode: local\nazure:\n  enabled: false\n"; }
