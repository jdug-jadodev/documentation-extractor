import type { CandidateStack, CapabilityCoverage, Diagnostic, Evidence, ExtractionOptions, ExtractionResult, ExtractorPlugin, Fact, Inventory, SnapshotReader } from "../contracts/types.js";
import { sha256, stableId, compareBytes } from "../platform/hash.js";
import { BoundedWorkerPool } from "../platform/worker_pool.js";

interface GrammarWorkerInput { grammarRoot: string; language: string; source: string; }
interface GrammarWorkerOutput { root: string; hasErrors: boolean; }

export interface PatternRule {
  id: string;
  version: string;
  capability: string;
  languages: readonly string[];
  file: RegExp;
  pattern: RegExp;
  factKind: string;
  map(match: RegExpExecArray, context: { path: string; componentId: string }): unknown;
}

export class PatternExtractorPlugin implements ExtractorPlugin {
  readonly id: string;
  readonly version: string;
  readonly supported_languages: readonly string[];
  readonly capabilities: Readonly<Record<string, "implemented" | "partial" | "unsupported">>;
  readonly rule_versions: Readonly<Record<string, string>>;
  readonly #rules: readonly PatternRule[];

  constructor(options: { id: string; version: string; languages: readonly string[]; capabilities: Readonly<Record<string, "implemented" | "partial" | "unsupported">>; rules: readonly PatternRule[] }) {
    this.id = options.id; this.version = options.version; this.supported_languages = options.languages; this.capabilities = options.capabilities; this.#rules = options.rules;
    this.rule_versions = Object.fromEntries(options.rules.map((rule) => [rule.id, rule.version]));
  }

  async detect(inventory: Inventory): Promise<CandidateStack[]> {
    return inventory.candidate_stacks.filter((item) => item.plugin_id === this.id);
  }

  async extract(reader: SnapshotReader, component: CandidateStack, options: ExtractionOptions): Promise<ExtractionResult> {
    const entries = [...await reader.list()].filter((entry) => entry.kind === "blob" && (options.include_paths === undefined || options.include_paths.has(entry.relative_path))).sort((a, b) => compareBytes(a.relative_path, b.relative_path));
    const evidence: Evidence[] = [];
    const facts: Fact[] = [];
    const diagnostics: Diagnostic[] = [];
    const counters = new Map<string, { processed: number; failed: number; limitations: Set<string> }>();
    const grammar = new BoundedWorkerPool<GrammarWorkerInput, GrammarWorkerOutput>(new URL("./grammar_worker.js", import.meta.url), 2);
    for (const rule of this.#rules) counters.set(rule.capability, { processed: 0, failed: 0, limitations: new Set() });
    try { for (const entry of entries) {
      const applicable = this.#rules.filter((rule) => resetTest(rule.file, entry.relative_path));
      if (applicable.length === 0 || entry.size > options.max_file_bytes) continue;
      let source: string;
      try { source = Buffer.from(await reader.read(entry.relative_path, { maxBytes: options.max_file_bytes, ...(options.signal === undefined ? {} : { signal: options.signal }) })).toString("utf8"); }
      catch (error) { for (const rule of applicable) counters.get(rule.capability)!.failed += 1; diagnostics.push(diagnostic(reader, entry.relative_path, "SOURCE_READ_FAILED", error)); continue; }
      const language = languageForPath(entry.relative_path);
      if (language !== null) {
        try { const syntax = await grammar.run({ grammarRoot: options.grammar_root, language, source }, { timeoutMs: 30_000, ...(options.signal === undefined ? {} : { signal: options.signal }) }); if (syntax.hasErrors) diagnostics.push(diagnostic(reader, entry.relative_path, "SYNTAX_PARTIAL", new Error("El árbol sintáctico contiene errores; se conservan hechos independientes."), "warning")); }
        catch (error) { diagnostics.push(diagnostic(reader, entry.relative_path, "GRAMMAR_UNAVAILABLE", error)); for (const rule of applicable) counters.get(rule.capability)!.limitations.add("Gramática ausente, corrupta o incompatible."); continue; }
      }
      for (const rule of applicable) {
        const counter = counters.get(rule.capability)!;
        counter.processed += 1;
        const pattern = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`);
        for (const match of source.matchAll(pattern)) {
          const start = Buffer.byteLength(source.slice(0, match.index ?? 0), "utf8");
          const end = start + Buffer.byteLength(match[0], "utf8");
          const evidenceId = stableId("evidence", reader.snapshot.id, entry.relative_path, start, end, rule.id);
          evidence.push({ schema_version: 3, id: evidenceId, repository_id: reader.snapshot.repository_id, snapshot_id: reader.snapshot.id, relative_path: entry.relative_path, source_hash: sha256(source), locator: { kind: "bytes", start, end }, rule_id: rule.id });
          const mapped = rule.map(match, { path: entry.relative_path, componentId: component.component_id });
          const value = mapped !== null && typeof mapped === "object" && !Array.isArray(mapped) && !("source_path" in mapped) ? { ...mapped, source_path: entry.relative_path } : mapped;
          facts.push({ schema_version: 3, id: stableId("fact", component.component_id, rule.factKind, value, evidenceId), kind: rule.factKind, component_id: component.component_id, value: normalizeFactValue(value), evidence_ids: [evidenceId], rule_id: rule.id });
        }
      }
    } } finally { await grammar.close(); }
    const coverage_by_capability: CapabilityCoverage[] = Object.entries(this.capabilities).map(([capability, status]) => { const counter = counters.get(capability) ?? { processed: 0, failed: 0, limitations: new Set<string>() }; return { capability, status, processed: counter.processed, failed: counter.failed, limitations: [...counter.limitations] }; });
    return { plugin_id: this.id, plugin_version: this.version, facts: deduplicateFacts(facts), evidence: deduplicateEvidence(evidence), diagnostics, coverage_by_capability, dependencies: entries.filter((entry) => this.#rules.some((rule) => resetTest(rule.file, entry.relative_path))).map((entry) => entry.relative_path) };
  }
}

function languageForPath(path: string): string | null {
  if (/\.py$/iu.test(path)) return "python";
  if (/\.cs$/iu.test(path)) return "c_sharp";
  if (/\.java$/iu.test(path)) return "java";
  if (/\.tsx$/iu.test(path)) return "tsx";
  if (/\.ts$/iu.test(path)) return "typescript";
  if (/\.jsx?$/iu.test(path)) return "javascript";
  return null;
}

function resetTest(pattern: RegExp, value: string): boolean { pattern.lastIndex = 0; return pattern.test(value); }
function normalizeFactValue(value: unknown): Fact["value"] { return value === undefined ? null : value as Fact["value"]; }
function deduplicateFacts(values: Fact[]): Fact[] { return [...new Map(values.map((value) => [value.id, value])).values()].sort((a, b) => compareBytes(a.id, b.id)); }
function deduplicateEvidence(values: Evidence[]): Evidence[] { return [...new Map(values.map((value) => [value.id, value])).values()].sort((a, b) => compareBytes(a.id, b.id)); }
function diagnostic(reader: SnapshotReader, path: string, code: string, error: unknown, severity: Diagnostic["severity"] = "error"): Diagnostic { return { schema_version: 3, id: stableId("diagnostic", reader.snapshot.id, path, code), severity, code, scope: path, message: error instanceof Error ? error.message : String(error), evidence_ids: [], suggested_action: "Revise la capacidad afectada; no se completará con IA." }; }

export function method(value: string | undefined, fallback = "UNKNOWN"): string { return (value ?? fallback).toLocaleUpperCase("en-US"); }
export function pathValue(value: string | undefined): string { return (value ?? "").replace(/^['"`]|['"`]$/gu, ""); }
