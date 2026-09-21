import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentResult, Evidence, Fact, Snapshot } from "./types.js";

const SCHEMA_FILES = [
  "config", "snapshot", "evidence", "fact", "bundle", "graph", "task-packet", "agent-result", "document", "review", "approval", "publication", "run",
] as const;

export type SchemaName = typeof SCHEMA_FILES[number];

export class ContractValidationError extends Error {
  readonly schema: string;
  readonly errors: ErrorObject[];
  constructor(schema: string, errors: ErrorObject[]) {
    super(`Contrato ${schema} inválido: ${formatErrors(errors)}`);
    this.name = "ContractValidationError";
    this.schema = schema;
    this.errors = errors;
  }
}

export class ContractValidator {
  readonly #ajv: InstanceType<typeof Ajv2020>;
  readonly #validators = new Map<SchemaName, ValidateFunction>();

  private constructor(ajv: InstanceType<typeof Ajv2020>) { this.#ajv = ajv; }

  static async create(packageRoot: string): Promise<ContractValidator> {
    const ajv = new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, removeAdditional: false, useDefaults: false, validateFormats: true });
    ajv.addFormat("date-time", { type: "string", validate: (value: string) => Number.isFinite(Date.parse(value)) && /T/u.test(value) });
    const instance = new ContractValidator(ajv);
    for (const name of SCHEMA_FILES) {
      const path = join(packageRoot, "schemas", "v3", `${name}.schema.json`);
      const schema = JSON.parse(await readFile(path, "utf8")) as object;
      ajv.addSchema(schema);
    }
    for (const name of SCHEMA_FILES) {
      const id = `https://docsys.local/schemas/v3/${name}.schema.json`;
      const validate = ajv.getSchema(id);
      if (!validate) throw new Error(`No se registró el esquema ${name}.`);
      instance.#validators.set(name, validate);
    }
    return instance;
  }

  assert<T>(schema: SchemaName, value: unknown): asserts value is T {
    const validate = this.#validators.get(schema);
    if (!validate) throw new Error(`Esquema no cargado: ${schema}`);
    if (!validate(value)) throw new ContractValidationError(schema, [...(validate.errors ?? [])]);
  }

  validateReferences(input: { facts: Fact[]; evidence: Evidence[]; snapshots: Snapshot[] }): void {
    const evidenceIds = new Set(input.evidence.map((item) => item.id));
    const snapshotIds = new Set(input.snapshots.map((item) => item.id));
    for (const evidence of input.evidence) if (!snapshotIds.has(evidence.snapshot_id)) throw new ContractValidationError("references", [referenceError(`/evidence/${evidence.id}/snapshot_id`, evidence.snapshot_id)]);
    for (const fact of input.facts) for (const id of fact.evidence_ids) if (!evidenceIds.has(id)) throw new ContractValidationError("references", [referenceError(`/facts/${fact.id}/evidence_ids`, id)]);
  }

  assertAgentResultReferences(result: AgentResult, knownFactIds: ReadonlySet<string>, knownEvidenceIds: ReadonlySet<string>): void {
    this.assert<AgentResult>("agent-result", result);
    inspectPayload(result.payload, (key, value) => {
      if (key === "fact_ids" && Array.isArray(value)) for (const id of value) if (typeof id !== "string" || !knownFactIds.has(id)) throw new ContractValidationError("agent-result-references", [referenceError("/payload/fact_ids", String(id))]);
      if ((key === "evidence_ids" || key === "evidence_refs") && Array.isArray(value)) for (const id of value) if (typeof id !== "string" || !knownEvidenceIds.has(id)) throw new ContractValidationError("agent-result-references", [referenceError(`/payload/${key}`, String(id))]);
    });
  }
}

function referenceError(instancePath: string, value: string): ErrorObject {
  return { instancePath, schemaPath: "#/references", keyword: "reference", params: { value }, message: `referencia inexistente: ${value}` };
}

function formatErrors(errors: ErrorObject[]): string {
  return errors.map((error) => `${error.instancePath || "/"} ${error.message ?? error.keyword}`).join("; ");
}

function inspectPayload(value: unknown, visitor: (key: string, value: unknown) => void): void {
  if (Array.isArray(value)) { for (const item of value) inspectPayload(item, visitor); return; }
  if (value === null || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) { visitor(key, nested); inspectPayload(nested, visitor); }
}
