export function partitionContext(packet, maxBytes = 49_152) {
    const base = { ...packet, facts: [], evidence: [] };
    const baseBytes = Buffer.byteLength(JSON.stringify(base), "utf8");
    if (baseBytes > maxBytes)
        throw new Error("La solicitud, perfiles o plantilla exceden el límite incluso sin hechos.");
    const evidenceById = new Map(packet.evidence.map((item) => [item.id, item]));
    const parts = [];
    let facts = [], evidence = [];
    const flush = () => {
        if (facts.length === 0 && parts.length > 0)
            return;
        const partPacket = { ...packet, facts, evidence };
        const byteLength = Buffer.byteLength(JSON.stringify(partPacket), "utf8");
        const included = new Set(facts.map((item) => item.id));
        parts.push({ packet: partPacket, byte_length: byteLength, estimated_tokens: Math.ceil(byteLength / 4), omitted_fact_ids: packet.facts.filter((item) => !included.has(item.id)).map((item) => item.id) });
        facts = [];
        evidence = [];
    };
    for (const fact of packet.facts) {
        const candidateFacts = [...facts, fact];
        const candidateEvidence = [...new Map([...evidence, ...fact.evidence_ids.flatMap((id) => { const item = evidenceById.get(id); return item ? [item] : []; })].map((item) => [item.id, item])).values()];
        if (Buffer.byteLength(JSON.stringify({ ...packet, facts: candidateFacts, evidence: candidateEvidence }), "utf8") > maxBytes) {
            if (facts.length === 0)
                throw new Error(`Un hecho individual excede el límite: ${fact.id}`);
            flush();
        }
        facts.push(fact);
        evidence = [...new Map([...evidence, ...fact.evidence_ids.flatMap((id) => { const item = evidenceById.get(id); return item ? [item] : []; })].map((item) => [item.id, item])).values()];
    }
    flush();
    return parts;
}
//# sourceMappingURL=partition.js.map