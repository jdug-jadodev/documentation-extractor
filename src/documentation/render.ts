import type { DocumentModel, DocumentSection } from "../contracts/types.js";
import { assertNoKnownSecret } from "../security/redaction.js";

export function renderDocument(model: DocumentModel): string {
  const lines = [`---`, `document_id: ${yaml(model.document_id)}`, `run_id: ${yaml(model.run_id)}`, `schema_version: 3`, `format: ASD-TSE-100`, `status: ${model.status}`, `archify_status: ${model.archify.status}`, `---`, ``, `# ${escapeHeading(model.title)}`, ``];
  model.sections.forEach((section, index) => { lines.push(`## ${index + 1}. ${escapeHeading(section.title)}`, ""); for (const paragraph of section.paragraphs) lines.push(escapeMarkdown(paragraph), ""); for (const table of section.tables) lines.push(renderTable(table.headers, table.rows), ""); if (section.limitations.length > 0) { lines.push("### Limitaciones", ""); for (const limitation of section.limitations) lines.push(`- ${escapeMarkdown(limitation)}`); lines.push(""); } });
  lines.push("---", "", "> Documento generado a partir de hechos estructurados. Las inferencias, desconocidos y decisiones requieren revisión humana.", "");
  const result = lines.join("\n"); assertNoKnownSecret(result); return result;
}

export function renderSectionView(model: DocumentModel, sectionId: string): string {
  const section = model.sections.find((item) => item.id === sectionId); if (!section) throw new Error(`Sección inexistente: ${sectionId}`);
  const temporary: DocumentModel = { ...model, title: `${model.title} — ${section.title}`, sections: [section] };
  return renderDocument(temporary);
}

export function renderRelationshipMermaid(model: DocumentModel): string {
  const architecture = model.sections.find((section) => section.id === "arquitectura");
  if (!architecture) return "flowchart LR\n  empty[Sin relaciones sustentadas]";
  const table = architecture.tables[0]; if (!table || table.rows.length === 0) return "flowchart LR\n  empty[Sin relaciones sustentadas]";
  const ids = new Map<string, string>(); let counter = 0; const id = (label: string) => { let existing = ids.get(label); if (!existing) { existing = `n${counter++}`; ids.set(label, existing); } return existing; };
  const lines = ["flowchart LR"];
  for (const row of table.rows) { const from = row[0] ?? "?", relation = row[1] ?? "relación", to = row[2] ?? "?"; lines.push(`  ${id(from)}["${escapeMermaid(from)}"] -->|"${escapeMermaid(relation)}"| ${id(to)}["${escapeMermaid(to)}"]`); }
  return lines.join("\n");
}

function renderTable(headers: string[], rows: string[][]): string { const safeHeaders = headers.map(tableCell); const actualRows = rows.length > 0 ? rows : [headers.map(() => "No detectado")]; return [`| ${safeHeaders.join(" | ")} |`, `| ${safeHeaders.map(() => "---").join(" | ")} |`, ...actualRows.map((row) => `| ${headers.map((_, index) => tableCell(row[index] ?? "")).join(" | ")} |`)].join("\n"); }
function tableCell(value: string): string { return escapeMarkdown(value).replaceAll("|", "\\|").replace(/[\r\n]+/gu, " "); }
function escapeMarkdown(value: string): string { return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, "[contenido omitido]").replace(/javascript:/giu, "blocked:"); }
function escapeHeading(value: string): string { return escapeMarkdown(value).replace(/[\r\n#]/gu, " "); }
function escapeMermaid(value: string): string { return value.replace(/["\r\n]/gu, "'").replace(/[<>]/gu, ""); }
function yaml(value: string): string { return JSON.stringify(value); }
