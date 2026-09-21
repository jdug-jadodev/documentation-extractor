import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { atomicWrite } from "./platform/fs.js";
import { findExecutable } from "./preflight.js";
import { runRestrictedProcess } from "./platform/process.js";
import { runDeterministicExtraction } from "./engine.js";
import { buildGraph } from "./correlation/graph.js";
import { stableId } from "./platform/hash.js";
const PRODUCER_MASTER = `from fastapi import FastAPI\napp = FastAPI()\n\n@app.post("/novedades")\ndef crear_novedad():\n    return {"ok": True}\n\n@app.get("/novedades/{id}")\ndef consultar_novedad(id: str):\n    return {"id": id}\n`;
const PRODUCER_FEATURE = `${PRODUCER_MASTER}\n@app.get("/novedades/estado")\ndef consultar_estado():\n    return {"estado": "demo"}\n`;
const CONSUMER_MASTER = `from fastapi import FastAPI\nimport httpx\napp = FastAPI()\nclient = httpx.Client(base_url="http://demo-productor.internal")\n\n@app.get("/resumen/{id}")\ndef resumen(id: str):\n    return client.get(f"/novedades/{id}").json()\n`;
export async function runDemo(packageRoot, validator) {
    const root = await mkdtemp(join(tmpdir(), "docsys-demo-"));
    const producer = join(root, "demo-productor"), consumer = join(root, "demo-consumidor");
    await mkdir(producer);
    await mkdir(consumer);
    const git = await findExecutable(process.platform === "win32" ? ["git.exe"] : ["git"]);
    if (!git)
        throw new Error("Git no está disponible para crear la demo sintética.");
    await initializeRepository(git, producer, "app.py", PRODUCER_MASTER);
    await gitCommand(git, producer, ["switch", "-c", "feature/notificaciones"]);
    await atomicWrite(join(producer, "app.py"), PRODUCER_FEATURE);
    await gitCommand(git, producer, ["add", "--", "app.py"]);
    await gitCommand(git, producer, ["commit", "-m", "demo feature"]);
    await initializeRepository(git, consumer, "app.py", CONSUMER_MASTER);
    const workspacePath = join(root, "demo.code-workspace"), configPath = join(root, "knowledge.yaml");
    await atomicWrite(workspacePath, `${JSON.stringify({ folders: [{ name: "demo-productor", path: "./demo-productor" }, { name: "demo-consumidor", path: "./demo-consumidor" }] }, null, 2)}\n`);
    await atomicWrite(configPath, `schema_version: 3\nsetup_status: configured\nworkspace_file: ./demo.code-workspace\nvault_path: ./boveda\nrepositories:\n  - id: demo-productor\n    path: ./demo-productor\n    enabled: true\n    default_branch: master\n  - id: demo-consumidor\n    path: ./demo-consumidor\n    enabled: true\n    default_branch: master\nai:\n  provider: copilot-cli\n  model: null\n  strong_model: null\n  max_invocations: 0\nsharing:\n  mode: local\nazure:\n  enabled: false\noverrides:\n  aliases:\n    http://demo-productor.internal: demo-productor\n`);
    const masterProducer = await runDeterministicExtraction({ packageRoot, configPath, repositoryId: "demo-productor", ref: "master", validator });
    const masterConsumer = await runDeterministicExtraction({ packageRoot, configPath, repositoryId: "demo-consumidor", ref: "master", validator });
    const masterFacts = [...masterProducer.bundle.facts, ...masterConsumer.bundle.facts];
    const masterGraph = buildGraph(masterFacts, { schema_version: 3, id: stableId("scenario", "demo-master"), snapshots: [{ repository_id: "demo-productor", snapshot_id: masterProducer.snapshot.id }, { repository_id: "demo-consumidor", snapshot_id: masterConsumer.snapshot.id }], environment: "demo", aliases: { "http://demo-productor.internal": "demo-productor" } });
    const featureProducer = await runDeterministicExtraction({ packageRoot, configPath, repositoryId: "demo-productor", ref: "feature/notificaciones", validator });
    const masterCount = endpoints(masterFacts), featureCount = endpoints([...featureProducer.bundle.facts, ...masterConsumer.bundle.facts]);
    return { schema_version: 3, kind: "synthetic_demo", ai_invocations: 0, workspace_root: root, knowledge_yaml: configPath, master: { endpoints: masterCount, relations: masterGraph.edges.filter((edge) => edge.type === "calls_http" && edge.status === "supported").length }, feature: { endpoints: featureCount, added_endpoints: featureCount - masterCount }, notices: ["Datos sintéticos", "Sin interpretación IA", "No demuestra integración real con Copilot", "No se ejecutaron las aplicaciones FastAPI"] };
}
function endpoints(facts) { return facts.filter((fact) => fact.kind === "http_endpoint").length; }
async function initializeRepository(git, root, file, content) { await gitCommand(git, root, ["init", "-b", "master"]); await atomicWrite(join(root, file), content); await gitCommand(git, root, ["add", "--", file]); await gitCommand(git, root, ["commit", "-m", "demo master"]); }
async function gitCommand(git, root, args) { const result = await runRestrictedProcess({ executable: git, args: ["-C", root, ...args], cwd: root, timeout_ms: 20_000, max_stdout_bytes: 64 * 1024, max_stderr_bytes: 64 * 1024, allowed_environment: { GIT_AUTHOR_NAME: "Docsys Demo", GIT_AUTHOR_EMAIL: "demo@invalid.local", GIT_COMMITTER_NAME: "Docsys Demo", GIT_COMMITTER_EMAIL: "demo@invalid.local", GIT_NO_LAZY_FETCH: "1" } }); if (result.exit_code !== 0)
    throw new Error(`Git demo falló: ${result.stderr}`); }
//# sourceMappingURL=demo.js.map