import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { acquireFileLock, atomicWrite } from "../platform/fs.js";
import { stableId } from "../platform/hash.js";
import { validateApprovalReceipt } from "../review/approval.js";
import { createPublicationManifest, verifyPublicationManifest } from "./manifest.js";
export class LocalPublicationTarget {
    vaultRoot;
    publisherId;
    constructor(vaultRoot, publisherId) {
        this.vaultRoot = vaultRoot;
        this.publisherId = publisherId;
    }
    async publish(candidateRoot, receipt, options) {
        if (options.signal?.aborted)
            throw new Error("Publicación cancelada.");
        await validateApprovalReceipt(receipt, candidateRoot);
        const lock = await acquireFileLock(join(this.vaultRoot, ".docsys-publisher.lock"), { publisher: this.publisherId, pid: process.pid });
        const editionId = `${new Date().toISOString().replace(/[:.]/gu, "-")}-${stableId("edition", receipt.content_digest).slice(-10)}`;
        const publications = join(this.vaultRoot, "Publicaciones"), staging = join(this.vaultRoot, ".staging", editionId), destination = join(publications, editionId);
        try {
            await mkdir(join(this.vaultRoot, ".staging"), { recursive: true });
            await mkdir(staging, { recursive: false });
            const previous = await currentEditionId(this.vaultRoot);
            const manifest = await createPublicationManifest({ editionId, runId: receipt.run_id, root: candidateRoot, previousEditionId: previous });
            for (const file of manifest.files) {
                if (options.signal?.aborted)
                    throw new Error("Publicación cancelada.");
                const target = join(staging, ...file.path.split("/"));
                await mkdir(join(target, ".."), { recursive: true });
                await cp(join(candidateRoot, ...file.path.split("/")), target, { force: false, errorOnExist: true });
            }
            await atomicWrite(join(staging, "edicion.json"), `${JSON.stringify(manifest, null, 2)}\n`);
            await verifyPublicationManifest(staging, manifest);
            await mkdir(publications, { recursive: true });
            await cp(staging, destination, { recursive: true, force: false, errorOnExist: true });
            await verifyPublicationManifest(destination, manifest);
            await atomicWrite(join(destination, ".complete"), `${manifest.edition_id}\n`);
            await atomicWrite(join(this.vaultRoot, "Inicio.md"), renderRootIndex(manifest));
            await rm(staging, { recursive: true, force: true });
            return manifest;
        }
        catch (error) {
            await rm(staging, { recursive: true, force: true });
            throw error;
        }
        finally {
            await lock.release();
        }
    }
}
async function currentEditionId(root) { try {
    const value = await readFile(join(root, "Inicio.md"), "utf8");
    return /edition_id:\s*([^\s]+)/u.exec(value)?.[1] ?? null;
}
catch {
    return null;
} }
function renderRootIndex(manifest) { return `---\nedition_id: ${manifest.edition_id}\nrun_id: ${manifest.run_id}\n---\n\n# Documentación del equipo\n\nEdición actual: [[Publicaciones/${manifest.edition_id}/Inicio|${manifest.edition_id}]]\n\n${manifest.previous_edition_id ? `Edición anterior: [[Publicaciones/${manifest.previous_edition_id}/Inicio|${manifest.previous_edition_id}]]\n` : ""}`; }
//# sourceMappingURL=local.js.map