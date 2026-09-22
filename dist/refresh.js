import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { configurationState, loadConfiguration } from "./config.js";
import { runDeterministicScenario } from "./engine.js";
import { atomicWrite } from "./platform/fs.js";
import { runRestrictedProcess } from "./platform/process.js";
import { preflight } from "./preflight.js";
import { prepareAndPublishDocumentation } from "./run_services.js";
export async function refreshKnowledge(input) {
    const config = await loadConfiguration(input.configPath, input.validator);
    if (await configurationState(config) === "configuration_pending")
        throw Object.assign(new Error("Configuración pendiente"), { code: "CONFIGURATION_PENDING", exitCode: 2 });
    const repositoryIds = [...new Set((input.repositoryIds ?? config.repositories.filter((item) => item.enabled).map((item) => item.id)).map((item) => item.trim()).filter(Boolean))];
    if (repositoryIds.length === 0)
        throw new Error("No hay repositorios habilitados para actualizar.");
    const report = await preflight(config, repositoryIds);
    if (report.status !== "ready" || report.git_executable === null)
        throw new Error(report.issues.map((item) => item.message).join("; "));
    const refs = Object.fromEntries(repositoryIds.map((id) => {
        const repository = config.repositories.find((item) => item.id === id);
        if (repository === undefined)
            throw new Error(`Repositorio no autorizado: ${id}`);
        const ref = input.refs?.[id] ?? repository.default_branch;
        if (ref === null || ref.trim() === "")
            throw new Error(`La rama de ${id} no está configurada.`);
        return [id, ref];
    }));
    const baseline = await findCompatibleBaseline(config, repositoryIds, refs);
    const synchronized = [];
    for (const repositoryId of repositoryIds) {
        const ready = report.repositories.find((item) => item.id === repositoryId);
        if (ready === undefined)
            throw new Error(`Repositorio no disponible: ${repositoryId}`);
        synchronized.push(await synchronizeBranch({ git: report.git_executable, root: ready.real_root, repositoryId, branch: refs[repositoryId], syncRemote: input.syncRemote ?? true, ...(input.signal === undefined ? {} : { signal: input.signal }) }));
    }
    const changedPaths = {};
    for (const item of synchronized) {
        const previous = baseline?.snapshots.find((snapshot) => snapshot.repository_id === item.repository_id)?.commit_oid;
        const ready = report.repositories.find((entry) => entry.id === item.repository_id);
        changedPaths[item.repository_id] = previous === undefined || previous === item.commit_after
            ? []
            : await diffPaths(report.git_executable, ready.real_root, previous, item.commit_after, input.signal);
    }
    if (baseline !== null && synchronized.every((item) => baseline.snapshots.some((snapshot) => snapshot.repository_id === item.repository_id && snapshot.commit_oid === item.commit_after))) {
        const shouldPublish = input.publish ?? true;
        const publication = shouldPublish && !baseline.published ? await prepareAndPublishDocumentation(input.packageRoot, config, baseline.run_id) : undefined;
        if (shouldPublish || baseline.published)
            await atomicWrite(join(config.state_root, "current-run.json"), `${JSON.stringify({ schema_version: 3, run_id: baseline.run_id, repositories: repositoryIds, refs, published: shouldPublish || baseline.published, updated_at: new Date().toISOString() }, null, 2)}\n`);
        return {
            schema_version: 3,
            status: "unchanged",
            run_id: baseline.run_id,
            baseline_run_id: baseline.run_id,
            repositories: synchronized.map((item) => ({ ...item, changed_paths: [], update_mode: "reused", reprocessed_paths: [], reused_files: 0 })),
            relations: baseline.relations,
            ai_invocations: 0,
            published: shouldPublish || baseline.published,
            ...(publication === undefined ? {} : { publication }),
        };
    }
    const run = await runDeterministicScenario({
        packageRoot: input.packageRoot,
        configPath: input.configPath,
        repositoryIds,
        refs,
        validator: input.validator,
        ...(baseline === null ? {} : { incremental: { baseline_run_id: baseline.run_id, changed_paths: changedPaths } }),
        ...(input.signal === undefined ? {} : { signal: input.signal }),
    });
    const shouldPublish = input.publish ?? true;
    const publication = shouldPublish ? await prepareAndPublishDocumentation(input.packageRoot, config, run.run_id) : undefined;
    await atomicWrite(join(config.state_root, "current-run.json"), `${JSON.stringify({ schema_version: 3, run_id: run.run_id, repositories: repositoryIds, refs, published: shouldPublish, updated_at: new Date().toISOString() }, null, 2)}\n`);
    return {
        schema_version: 3,
        status: "updated",
        run_id: run.run_id,
        baseline_run_id: baseline?.run_id ?? null,
        repositories: synchronized.map((item) => {
            const extraction = run.repositories.find((entry) => entry.repository_id === item.repository_id);
            return { ...item, changed_paths: changedPaths[item.repository_id] ?? [], update_mode: extraction.update.mode, reprocessed_paths: extraction.update.reprocessed_paths, reused_files: extraction.update.reused_files };
        }),
        relations: run.graph.edges.length,
        ai_invocations: 0,
        published: shouldPublish,
        ...(publication === undefined ? {} : { publication }),
    };
}
async function synchronizeBranch(input) {
    const valid = await git(input, ["check-ref-format", "--branch", input.branch], 4096);
    if (valid.exit_code !== 0)
        throw new Error(`Rama inválida para ${input.repositoryId}: ${input.branch}`);
    const before = await commit(input, input.branch);
    if (!input.syncRemote)
        return { repository_id: input.repositoryId, branch: input.branch, remote: null, commit_before: before, commit_after: before, fetched: false, pulled: false };
    const branch = await requiredGit(input, ["branch", "--show-current"], 4096, "No se pudo determinar la rama activa");
    if (branch.trim() !== input.branch)
        throw new Error(`${input.repositoryId}: la rama activa es ${branch.trim() || "HEAD separado"}; cambie a ${input.branch} antes de sincronizar. El motor no cambia ramas automáticamente.`);
    const status = await requiredGit(input, ["status", "--porcelain=v1", "--untracked-files=normal"], 1024 * 1024, "No se pudo comprobar el árbol de trabajo");
    if (status.trim() !== "")
        throw new Error(`${input.repositoryId}: hay cambios locales sin commit. No se ejecutará pull ni se sobrescribirá el trabajo del desarrollador.`);
    const upstreamResult = await git(input, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", `${input.branch}@{upstream}`], 4096);
    const upstream = upstreamResult.exit_code === 0 ? upstreamResult.stdout.trim() : `origin/${input.branch}`;
    const slash = upstream.indexOf("/");
    const remote = slash > 0 ? upstream.slice(0, slash) : "origin";
    const remoteCheck = await git(input, ["remote", "get-url", remote], 16 * 1024);
    if (remoteCheck.exit_code !== 0)
        throw new Error(`${input.repositoryId}: no existe el remoto ${remote} para sincronizar ${input.branch}.`);
    await requiredGit(input, ["fetch", "--prune", remote], 4 * 1024 * 1024, `Falló git fetch desde ${remote}`, 120_000);
    const remoteCommit = await commit(input, upstream);
    if (remoteCommit !== before) {
        const ancestor = await git(input, ["merge-base", "--is-ancestor", before, remoteCommit], 4096);
        if (ancestor.exit_code !== 0)
            throw new Error(`${input.repositoryId}: la rama local no puede avanzar por fast-forward hasta ${upstream}. Revise commits locales o una divergencia; el motor no hará reset ni merge forzado.`);
        await requiredGit(input, ["pull", "--ff-only", "--no-rebase", remote, input.branch], 4 * 1024 * 1024, `Falló git pull --ff-only de ${remote}/${input.branch}`, 120_000);
    }
    const after = await commit(input, input.branch);
    return { repository_id: input.repositoryId, branch: input.branch, remote, commit_before: before, commit_after: after, fetched: true, pulled: before !== after };
}
async function diffPaths(gitExecutable, root, base, target, signal) {
    if (!/^[0-9a-f]{40,64}$/u.test(base) || !/^[0-9a-f]{40,64}$/u.test(target))
        throw new Error("OID inválido al calcular cambios incrementales.");
    const result = await runRestrictedProcess({ executable: gitExecutable, args: ["-C", root, "-c", `core.hooksPath=${nullDevice()}`, "diff", "--name-status", "-z", "--find-renames", base, target, "--"], cwd: root, timeout_ms: 30_000, max_stdout_bytes: 64 * 1024 * 1024, max_stderr_bytes: 16 * 1024, ...(signal === undefined ? {} : { signal }) });
    if (result.exit_code !== 0)
        throw new Error(`No se pudo calcular el diff incremental: ${clean(result.stderr)}`);
    const fields = result.stdout.split("\0").filter(Boolean);
    const paths = new Set();
    for (let index = 0; index < fields.length;) {
        const status = fields[index++];
        const first = fields[index++];
        if (first === undefined)
            throw new Error("Salida incompleta de git diff.");
        paths.add(first);
        if (/^[RC]/u.test(status)) {
            const second = fields[index++];
            if (second === undefined)
                throw new Error("Renombre incompleto en git diff.");
            paths.add(second);
        }
    }
    return [...paths].sort();
}
async function commit(input, ref) {
    const value = (await requiredGit(input, ["rev-parse", "--verify", `${ref}^{commit}`], 4096, `No se pudo resolver ${ref}`)).trim();
    if (!/^[0-9a-f]{40,64}$/u.test(value))
        throw new Error(`${input.repositoryId}: Git devolvió un commit inválido.`);
    return value;
}
async function git(input, args, maxStdout, timeout = 30_000) {
    return await runRestrictedProcess({ executable: input.git, args: ["-C", input.root, "-c", `core.hooksPath=${nullDevice()}`, ...args], cwd: input.root, timeout_ms: timeout, max_stdout_bytes: maxStdout, max_stderr_bytes: 64 * 1024, ...(input.signal === undefined ? {} : { signal: input.signal }) });
}
async function requiredGit(input, args, maxStdout, label, timeout) {
    const result = await git(input, args, maxStdout, timeout);
    if (result.exit_code !== 0)
        throw new Error(`${label}: ${clean(result.stderr)}`);
    return result.stdout;
}
async function findCompatibleBaseline(config, repositories, refs) {
    const preferred = await readJson(join(config.state_root, "current-run.json")).catch(() => null);
    const currentEdition = await readJson(join(config.vault_root, "Actual", "edicion.json")).catch(() => null);
    const candidates = [...new Set([preferred?.run_id, currentEdition?.run_id, ...(await readdir(join(config.state_root, "runs"), { withFileTypes: true }).catch(() => [])).filter((item) => item.isDirectory()).map((item) => item.name).sort().reverse()].filter((item) => typeof item === "string"))];
    for (const runId of candidates) {
        if (!/^run-[A-Za-z0-9._-]+$/u.test(runId))
            continue;
        try {
            const run = await readJson(join(config.state_root, "runs", runId, "run.json"));
            const snapshots = run.snapshots ?? [];
            if (snapshots.length !== repositories.length || !repositories.every((id) => snapshots.some((snapshot) => snapshot.repository_id === id && snapshot.requested_ref === refs[id])))
                continue;
            const graph = await readJson(join(config.state_root, "runs", runId, "graph.json"));
            return { run_id: runId, snapshots, relations: graph.edges?.length ?? 0, published: currentEdition?.run_id === runId || (preferred?.run_id === runId && preferred.published === true) };
        }
        catch { /* Ignore incomplete historical runs. */ }
    }
    return null;
}
async function readJson(path) { return JSON.parse(await readFile(path, "utf8")); }
function clean(value) { return value.replace(/[\r\n]+/gu, " ").trim().slice(0, 500); }
function nullDevice() { return process.platform === "win32" ? "NUL" : "/dev/null"; }
//# sourceMappingURL=refresh.js.map