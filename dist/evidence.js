import { sha256 } from "./platform/hash.js";
export function validateEvidence(evidence, facts, snapshots) {
    const snapshotIds = new Set(snapshots.map((snapshot) => snapshot.id));
    const evidenceIds = new Set();
    for (const item of evidence) {
        if (evidenceIds.has(item.id))
            throw new Error(`Evidencia duplicada: ${item.id}`);
        evidenceIds.add(item.id);
        if (!snapshotIds.has(item.snapshot_id))
            throw new Error(`Snapshot inexistente en evidencia ${item.id}: ${item.snapshot_id}`);
        if (!/^[0-9a-f]{64}$/u.test(item.source_hash))
            throw new Error(`Hash de fuente inválido: ${item.id}`);
        if (item.relative_path.startsWith("/") || item.relative_path.split("/").includes(".."))
            throw new Error(`Ruta de evidencia no publicable: ${item.relative_path}`);
        if (item.locator.start !== undefined && item.locator.end !== undefined && item.locator.end < item.locator.start)
            throw new Error(`Localizador invertido: ${item.id}`);
    }
    for (const fact of facts) {
        if (fact.evidence_ids.length === 0)
            throw new Error(`Hecho sin evidencia: ${fact.id}`);
        for (const id of fact.evidence_ids)
            if (!evidenceIds.has(id))
                throw new Error(`Evidencia inexistente ${id} para hecho ${fact.id}`);
    }
}
export function verifyEvidenceBytes(item, bytes) { return sha256(bytes) === item.source_hash; }
//# sourceMappingURL=evidence.js.map