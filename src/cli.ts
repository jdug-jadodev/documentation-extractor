import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, stderr } from "node:process";
import type { ContractValidator } from "./contracts/validator.js";
import { ContractValidator as Validator } from "./contracts/validator.js";
import { loadConfiguration, configurationState } from "./config.js";
import { showMainMenu, type MenuAction } from "./ui/menu.js";
import { runSetup } from "./ui/setup.js";
import { runDeterministicScenario } from "./engine.js";
import { runDemo } from "./demo.js";
import { GrammarManager } from "./extractors/grammar.js";
import { applyLegacyMigration, planLegacyMigration, restoreLegacyConfiguration } from "./migration.js";
import { openObsidian } from "./obsidian/open.js";
import { copyEditionToFolder } from "./publication/folder.js";
import { verifyPublicationManifest } from "./publication/manifest.js";
import { restoreEditionIndex } from "./publication/history.js";
import type { QueryCategory } from "./query.js";
import { compareRuns, explainRelations, loadRunArtifacts, prepareAndPublishDocumentation, prepareProposal, prepareRunDocumentation, queryRunArtifacts, renderRunQueryTable, traceFlow, validatedRunRoot } from "./run_services.js";
import type { ProposalType } from "./proposal/model.js";
import type { PublicationManifest } from "./contracts/types.js";
import { refreshKnowledge } from "./refresh.js";

export interface CliOptions { packageRoot?: string; }

export async function runCli(argv: string[], options: CliOptions = {}): Promise<number> {
  const packageRoot = options.packageRoot ?? resolve(new URL("..", import.meta.url).pathname);
  const jsonMode = argv.includes("--json");
  try {
    const validator = await Validator.create(packageRoot);
    if (argv.length === 0) return await interactiveMenu(packageRoot, validator);
    const command = argv[0]!;
    const parsed = parseCommand(argv.slice(1));
    const configPath = resolve(String(parsed.values.config ?? join(packageRoot, "knowledge.yaml")));
    let result: unknown;
    if (command === "configurar") result = await configure(configPath, validator, parsed.values["no-interactivo"] === true);
    else if (command === "verificar") result = await verify(packageRoot, configPath, validator);
    else if (command === "actualizar") result = await update(packageRoot, configPath, validator, parsed.values);
    else if (command === "sincronizar") result = await synchronizeKnowledge(packageRoot, configPath, validator, parsed.values);
    else if (command === "relacion") result = await relation(configPath, validator, parsed.values);
    else if (command === "flujo") result = await flow(configPath, validator, parsed.values);
    else if (command === "comparar") result = await compare(configPath, validator, parsed.values);
    else if (command === "proponer") result = await propose(configPath, validator, parsed.values);
    else if (command === "demo") result = await runDemo(packageRoot, validator);
    else if (command === "migrar") result = await migrate(packageRoot, configPath, validator, parsed.values);
    else if (command === "revertir-migracion") result = await revertMigration(configPath, parsed.values);
    else if (command === "abrir") result = await openVault(configPath, validator);
    else if (command === "estado") result = await readRun(configPath, validator, requiredString(parsed.values.run, "--run"), "run.json");
    else if (command === "reanudar") result = await resumeStatus(configPath, validator, requiredString(parsed.values.run, "--run"));
    else if (command === "revisar") result = await reviewRun(packageRoot, configPath, validator, requiredString(parsed.values.run, "--run"));
    else if (command === "documentar") result = await documentRun(packageRoot, configPath, validator, requiredString(parsed.values.run, "--run"));
    else if (command === "consultar") result = await queryRun(configPath, validator, parsed.positionals[0] ?? "endpoints", parsed.values);
    else if (command === "compartir") result = await shareEdition(configPath, validator, parsed.values);
    else if (command === "verificar-edicion") result = await verifyEdition(requiredString(parsed.values.ruta, "--ruta"));
    else if (command === "restaurar") result = await restoreEdition(configPath, validator, requiredString(parsed.values.edicion, "--edicion"), parsed.values["no-interactivo"] === true);
    else throw Object.assign(new Error(`Comando desconocido: ${command}`), { exitCode: 2 });
    emit(result, jsonMode);
    return 0;
  } catch (error) {
    const exitCode = typeof (error as { exitCode?: unknown }).exitCode === "number" ? (error as { exitCode: number }).exitCode : 5;
    const message = error instanceof Error ? error.message : String(error);
    if (jsonMode) stdout.write(`${JSON.stringify({ status: exitCode === 3 ? "awaiting_confirmation" : "failed", exit_code: exitCode, error: message })}\n`);
    else stderr.write(`${message}\n`);
    return exitCode;
  }
}

function parseCommand(argv: string[]) {
  return parseArgs({ args: argv, allowPositionals: true, strict: true, options: {
    config: { type: "string" }, json: { type: "boolean" }, "no-interactivo": { type: "boolean" },
    repo: { type: "string" }, repos: { type: "string" }, rama: { type: "string" }, ramas: { type: "string" },
    run: { type: "string" }, base: { type: "string" }, desde: { type: "string" }, hasta: { type: "string" },
    "sin-ia": { type: "boolean" }, "sin-publicar": { type: "boolean" }, ia: { type: "boolean" },
    "incluir-cambios-locales": { type: "boolean" }, "dry-run": { type: "boolean" }, aplicar: { type: "boolean" }, origen: { type: "string" }, recibo: { type: "string" },
    destino: { type: "string" }, edicion: { type: "string" }, ruta: { type: "string" }, tipo: { type: "string" },
    solicitud: { type: "string" }, requisito: { type: "string", multiple: true }, rutas: { type: "string" }, limit: { type: "string" }, offset: { type: "string" },
  } });
}

async function interactiveMenu(packageRoot: string, validator: ContractValidator): Promise<number> {
  const configPath = join(packageRoot, "knowledge.yaml");
  const config = await loadConfiguration(configPath, validator);
  const action = await showMainMenu(config);
  if (action === "exit") return 0;
  if (action === "configure") { await runSetup(configPath, validator); return 0; }
  if (action === "open") { const result = await openObsidian(config.vault_root); if (!result.opened) stdout.write(`${result.manual}\n`); return result.opened ? 0 : 2; }
  if (await configurationState(config) === "configuration_pending") { stdout.write("Configuración pendiente. No se inició ningún análisis automático.\n"); return 2; }
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const values = await promptForAction(rl, action);
    if (values === null) return 0;
    let result: unknown;
    if (action === "update-one" || action === "update-many") result = await update(packageRoot, configPath, validator, values);
    else if (action === "relation") result = await relation(configPath, validator, values);
    else if (action === "flow") result = await flow(configPath, validator, values);
    else if (action === "proposal") result = await propose(configPath, validator, values);
    else if (action === "query") result = await queryRun(configPath, validator, String(values.categoria ?? "endpoints"), values);
    else result = await documentRun(packageRoot, configPath, validator, requiredString(values.run, "run"));
    emit(result, false);
    return 0;
  } finally { rl.close(); }
}

async function promptForAction(rl: ReturnType<typeof createInterface>, action: MenuAction): Promise<Record<string, unknown> | null> {
  if (action === "update-one" || action === "update-many") {
    const repos = (await rl.question(action === "update-one" ? "Repositorio: " : "Repositorios separados por coma: ")).trim();
    const branch = (await rl.question("Rama/ref (vacío = configurada; para varias use repo=ref,repo=ref): ")).trim();
    if (!/^s(i)?$/iu.test((await rl.question("\u00bfPreparar análisis local sin IA y sin publicar? [s/N]: ")).trim())) return null;
    return action === "update-one" ? { repo: repos, ...(branch ? { rama: branch } : {}) } : { repos, ...(branch ? { ramas: branch } : {}) };
  }
  const run = (await rl.question("Run existente: ")).trim();
  if (action === "relation" || action === "flow") return { run, desde: (await rl.question("Componente origen: ")).trim(), hasta: (await rl.question("Componente destino: ")).trim() };
  if (action === "proposal") return { run, tipo: (await rl.question("Tipo (specification, migration o adr): ")).trim(), solicitud: (await rl.question("Cambio que quieres estudiar: ")).trim() };
  if (action === "query") return { run, repo: (await rl.question("Repositorio (vacío = todos): ")).trim() || undefined, categoria: (await rl.question("Categoría (endpoints, dependencies, messages, data, coverage o evidence): ")).trim() || "endpoints" };
  return { run };
}

async function configure(configPath: string, validator: ContractValidator, nonInteractive: boolean) { if (nonInteractive) throw Object.assign(new Error("Configurar requiere interacción humana."), { exitCode: 3 }); const value = await runSetup(configPath, validator); return value === null ? { status: "cancelled" } : { status: "configured" }; }
async function verify(packageRoot: string, configPath: string, validator: ContractValidator) { const config = await loadConfiguration(configPath, validator); const grammar = new GrammarManager(join(packageRoot, "assets", "grammars")); return { schema_version: 3, configuration: await configurationState(config), node: process.versions.node, platform: process.platform, architecture: process.arch, grammars: await grammar.verifyAll(), ai_invocations: 0, azure_enabled: config.azure.enabled }; }

async function update(packageRoot: string, configPath: string, validator: ContractValidator, values: Record<string, unknown>) {
  if (values.ia === true) throw Object.assign(new Error("Las llamadas IA requieren autorización específica y no están permitidas en esta ejecución."), { exitCode: 3 });
  const repositoryIds = parseList(typeof values.repos === "string" ? values.repos : requiredString(values.repo, "--repo o --repos"));
  const refs = parseRefs(values.ramas, repositoryIds, values.rama);
  let workingTreePaths: Record<string, string[]> | undefined;
  if (values["incluir-cambios-locales"] === true) {
    if (repositoryIds.length !== 1) throw new Error("Los cambios locales se capturan para un repositorio por vez.");
    const paths = parseList(requiredString(values.rutas, "--rutas (lista explícita de archivos)"));
    workingTreePaths = { [repositoryIds[0]!]: paths };
  }
  const result = await runDeterministicScenario({ packageRoot, configPath, repositoryIds, ...(Object.keys(refs).length === 0 ? {} : { refs }), ...(workingTreePaths === undefined ? {} : { workingTreePaths }), validator });
  return { schema_version: 3, status: "review", run_id: result.run_id, repositories: result.repositories.map((item) => ({ id: item.repository_id, ref: item.snapshot.requested_ref, commit: item.snapshot.commit_oid, facts: item.bundle.facts.length, quality: item.bundle.quality })), relations: result.graph.edges.length, ai_invocations: 0, published: false };
}

async function synchronizeKnowledge(packageRoot: string, configPath: string, validator: ContractValidator, values: Record<string, unknown>) {
  const config = await loadConfiguration(configPath, validator);
  const repositoryIds = typeof values.repos === "string" || typeof values.repo === "string"
    ? parseList(typeof values.repos === "string" ? values.repos : requiredString(values.repo, "--repo o --repos"))
    : config.repositories.filter((item) => item.enabled).map((item) => item.id);
  const refs = parseRefs(values.ramas, repositoryIds, values.rama);
  return await refreshKnowledge({ packageRoot, configPath, validator, repositoryIds, ...(Object.keys(refs).length === 0 ? {} : { refs }), syncRemote: true, publish: values["sin-publicar"] !== true });
}

async function relation(configPath: string, validator: ContractValidator, values: Record<string, unknown>) { const config = await loadConfiguration(configPath, validator); const runId = requiredString(values.run, "--run"); const artifacts = await loadRunArtifacts(config, runId); return explainRelations(artifacts.graph, runId, optionalString(values.desde), optionalString(values.hasta)); }
async function flow(configPath: string, validator: ContractValidator, values: Record<string, unknown>) { const config = await loadConfiguration(configPath, validator); const runId = requiredString(values.run, "--run"); const artifacts = await loadRunArtifacts(config, runId); return traceFlow(artifacts.graph, runId, requiredString(values.desde, "--desde"), requiredString(values.hasta, "--hasta")); }
async function compare(configPath: string, validator: ContractValidator, values: Record<string, unknown>) { const config = await loadConfiguration(configPath, validator); return await compareRuns(config, requiredString(values.base, "--base (run base)"), requiredString(values.run, "--run (run objetivo)"), optionalString(values.repo)); }
async function propose(configPath: string, validator: ContractValidator, values: Record<string, unknown>) { if (values.ia === true) throw Object.assign(new Error("La IA no está autorizada para esta ejecución; omita --ia para generar el borrador determinista."), { exitCode: 3 }); const config = await loadConfiguration(configPath, validator); return await prepareProposal(config, requiredString(values.run, "--run"), requiredString(values.tipo, "--tipo") as ProposalType, requiredString(values.solicitud, "--solicitud"), Array.isArray(values.requisito) ? values.requisito.map(String) : []); }
async function migrate(packageRoot: string, configPath: string, validator: ContractValidator, values: Record<string, unknown>) {
  const source = resolve(requiredString(values.origen, "--origen"));
  const plan = await planLegacyMigration(source);
  if (values["dry-run"] === true) return plan;
  if (values.aplicar !== true || values["no-interactivo"] === true || !stdin.isTTY) throw Object.assign(new Error("Aplicar una migración requiere --aplicar y confirmación humana interactiva."), { exitCode: 3 });
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    const confirmed = /^s(i)?$/iu.test((await rl.question("¿Aplicar este plan y archivar la configuración anterior? [s/N]: ")).trim());
    if (!confirmed) return { status: "cancelled" };
    const receipt = await applyLegacyMigration({ projectRoot: packageRoot, configPath, plan, validator });
    return { status: "configuration_pending", receipt, analysis_started: false };
  } finally { rl.close(); }
}
async function revertMigration(configPath: string, values: Record<string, unknown>) {
  if (values["no-interactivo"] === true || !stdin.isTTY) throw Object.assign(new Error("Revertir una migración requiere confirmación humana interactiva."), { exitCode: 3 });
  const receipt = resolve(requiredString(values.recibo, "--recibo"));
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const confirmed = /^s(i)?$/iu.test((await rl.question("¿Restaurar la configuración anterior archivada? [s/N]: ")).trim());
    if (!confirmed) return { status: "cancelled" };
    await restoreLegacyConfiguration(configPath, receipt);
    return { status: "restored", config_path: configPath };
  } finally { rl.close(); }
}
async function openVault(configPath: string, validator: ContractValidator) { const config = await loadConfiguration(configPath, validator); return await openObsidian(config.vault_root); }

async function reviewRun(packageRoot: string, configPath: string, validator: ContractValidator, runId: string) {
  const config = await loadConfiguration(configPath, validator);
  return await prepareRunDocumentation(packageRoot, config, runId);
}
async function documentRun(packageRoot: string, configPath: string, validator: ContractValidator, runId: string) {
  const config = await loadConfiguration(configPath, validator);
  return await prepareAndPublishDocumentation(packageRoot, config, runId);
}

async function queryRun(configPath: string, validator: ContractValidator, categoryInput: string, values: Record<string, unknown>) { const runId = requiredString(values.run, "--run"); const config = await loadConfiguration(configPath, validator); const artifacts = await loadRunArtifacts(config, runId); const repo = optionalString(values.repo); const category = parseQueryCategory(categoryInput); const result = queryRunArtifacts(artifacts, category, { ...(repo ? { repositoryId: repo, componentId: repo } : {}), limit: numberOption(values.limit, 100), offset: numberOption(values.offset, 0) }); return { ...result, table: renderRunQueryTable(category, result), run_id: runId, repository_id: repo ?? null, ai_invocations: 0 }; }
async function shareEdition(configPath: string, validator: ContractValidator, values: Record<string, unknown>) {
  const config = await loadConfiguration(configPath, validator), edition = requiredString(values.edicion, "--edicion"), destination = requiredString(values.destino, "--destino");
  const manifest = await readJson<PublicationManifest>(join(config.vault_root, "Publicaciones", edition, "edicion.json"));
  const sourceRun = await readJson<{ snapshots: Array<{ dirty: boolean }> }>(join(validatedRunRoot(config.state_root, manifest.run_id), "run.json"));
  if (sourceRun.snapshots.some((snapshot) => snapshot.dirty)) throw Object.assign(new Error("Una edición basada en cambios locales no puede compartirse. Cree un commit y una revisión nueva."), { exitCode: 4 });
  return destination.toLocaleLowerCase("en-US").endsWith(".zip")
    ? (await import("./publication/export.js")).exportEditionZip(config.vault_root, manifest, resolve(destination)).then(() => ({ exported: resolve(destination), receipt_pending: true }))
    : copyEditionToFolder(config.vault_root, manifest, resolve(destination)).then((path) => ({ exported: path, receipt_pending: true }));
}
async function verifyEdition(path: string) { const root = resolve(path), manifest = await readJson<PublicationManifest>(join(root, "edicion.json")); await verifyPublicationManifest(root, manifest); return { status: "complete", edition_id: manifest.edition_id, files: manifest.files.length }; }
async function restoreEdition(configPath: string, validator: ContractValidator, edition: string, nonInteractive: boolean) { if (nonInteractive) throw Object.assign(new Error("Restaurar requiere confirmación."), { exitCode: 3 }); const config = await loadConfiguration(configPath, validator); const rl = createInterface({ input: stdin, output: stdout }); try { const confirmed = /^s(i)?$/iu.test((await rl.question(`¿Restaurar ${edition} como visible? [s/N]: `)).trim()); await restoreEditionIndex(config.vault_root, edition, confirmed); return { status: "restored", edition_id: edition }; } finally { rl.close(); } }
async function readRun(configPath: string, validator: ContractValidator, runId: string, file: string) { const config = await loadConfiguration(configPath, validator); return await readJson(join(validatedRunRoot(config.state_root, runId), file)); }
async function resumeStatus(configPath: string, validator: ContractValidator, runId: string) { const run = await readRun(configPath, validator, runId, "run.json") as { tasks?: Array<{ id: string; status: string }> }; const pending = run.tasks?.filter((task) => !["completed", "cached"].includes(task.status)) ?? []; return { status: pending.length === 0 ? "review" : "review_required", run_id: runId, pending_tasks: pending, message: pending.length === 0 ? "No hay etapas deterministas por repetir." : "Reanude solo después de resolver los prerrequisitos indicados." }; }

function parseList(value: string): string[] { const items = [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))]; if (items.length === 0) throw new Error("La lista de repositorios está vacía."); return items; }
function parseRefs(raw: unknown, repositoryIds: string[], single: unknown): Record<string, string> { const refs: Record<string, string> = {}; if (typeof raw === "string") for (const pair of parseList(raw)) { const separator = pair.indexOf("="); if (separator < 1 || separator === pair.length - 1) throw new Error(`Referencia inválida: ${pair}. Use repo=ref.`); const id = pair.slice(0, separator).trim(), ref = pair.slice(separator + 1).trim(); if (!repositoryIds.includes(id)) throw new Error(`La referencia corresponde a un repositorio no seleccionado: ${id}`); refs[id] = ref; } if (typeof single === "string") { if (repositoryIds.length !== 1) throw new Error("--rama solo se admite con un repositorio; use --ramas repo=ref."); refs[repositoryIds[0]!] = single; } return refs; }
async function readJson<T = unknown>(path: string): Promise<T> { return JSON.parse(await readFile(path, "utf8")) as T; }
function requiredString(value: unknown, name: string): string { if (typeof value !== "string" || value.trim() === "") throw Object.assign(new Error(`Falta ${name}.`), { exitCode: 2 }); return value.trim(); }
function optionalString(value: unknown): string | undefined { return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined; }
function parseQueryCategory(value: string): QueryCategory { const allowed: QueryCategory[] = ["endpoints", "dependencies", "messages", "data", "architecture", "technologies", "coverage", "evidence"]; if (!allowed.includes(value as QueryCategory)) throw new Error(`Categoría de consulta inválida: ${value}`); return value as QueryCategory; }
function numberOption(value: unknown, fallback: number): number { if (typeof value !== "string") return fallback; const parsed = Number(value); if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`Número inválido: ${value}`); return parsed; }
function emit(value: unknown, json: boolean): void { if (json) stdout.write(`${JSON.stringify(value)}\n`); else stdout.write(`${typeof value === "string" ? value : JSON.stringify(value, null, 2)}\n`); }
