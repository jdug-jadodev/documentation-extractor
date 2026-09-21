export function parseAndValidateAgentResult(text, validator, expected) {
    let value;
    try {
        value = JSON.parse(stripCodeFence(text));
    }
    catch {
        throw new Error("La respuesta del agente no es JSON válido.");
    }
    validator.assert("agent-result", value);
    if (value.task_id !== expected.task_id || value.role !== expected.role)
        throw new Error("La respuesta no corresponde a la tarea o rol solicitados.");
    validator.assertAgentResultReferences(value, new Set(expected.facts.map((item) => item.id)), new Set(expected.evidence.map((item) => item.id)));
    assertCanonicalValuesUntouched(value.payload, expected.facts);
    return value;
}
function stripCodeFence(value) { const trimmed = value.trim(); const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/iu.exec(trimmed); return match?.[1] ?? trimmed; }
function assertCanonicalValuesUntouched(payload, facts) {
    const byId = new Map(facts.map((fact) => [fact.id, fact.value]));
    visit(payload, (record) => {
        if (typeof record.fact_id === "string" && "fact_value" in record && byId.has(record.fact_id) && JSON.stringify(record.fact_value) !== JSON.stringify(byId.get(record.fact_id)))
            throw new Error(`El agente intentó cambiar el valor del hecho ${record.fact_id}.`);
        if (record.approved === true || record.published === true)
            throw new Error("Un agente no puede conceder aprobación o publicación.");
    });
}
function visit(value, callback) { if (Array.isArray(value)) {
    value.forEach((item) => visit(item, callback));
    return;
} if (!value || typeof value !== "object")
    return; const record = value; callback(record); Object.values(record).forEach((item) => visit(item, callback)); }
//# sourceMappingURL=validation.js.map