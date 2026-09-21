import { StringDecoder } from "node:string_decoder";

export interface CopilotEvent { type?: string; data?: unknown; content?: unknown; [key: string]: unknown; }

export class JsonlEventDecoder {
  readonly #decoder = new StringDecoder("utf8");
  readonly #maxBytes: number;
  #buffer = "";
  #bytes = 0;
  constructor(maxBytes = 128 * 1024) { this.#maxBytes = maxBytes; }
  push(chunk: Uint8Array): CopilotEvent[] { this.#bytes += chunk.byteLength; if (this.#bytes > this.#maxBytes) throw new Error("La salida JSONL excedió el límite."); this.#buffer += this.#decoder.write(Buffer.from(chunk)); return this.#drain(false); }
  finish(): CopilotEvent[] { this.#buffer += this.#decoder.end(); return this.#drain(true); }
  #drain(final: boolean): CopilotEvent[] {
    const events: CopilotEvent[] = [];
    while (true) {
      const index = this.#buffer.indexOf("\n");
      if (index < 0) break;
      const line = this.#buffer.slice(0, index).trim(); this.#buffer = this.#buffer.slice(index + 1);
      if (line) events.push(parseEvent(line));
    }
    if (final && this.#buffer.trim()) { events.push(parseEvent(this.#buffer.trim())); this.#buffer = ""; }
    return events;
  }
}

export function extractFinalResponse(events: readonly CopilotEvent[]): { response: string; model: string | null; usage: Record<string, unknown> | null } {
  const finals = events.filter((event) => ["assistant.message", "result", "final", "assistant_message"].includes(String(event.type ?? "")) && typeof responseText(event) === "string");
  if (finals.length !== 1) throw new Error(finals.length === 0 ? "Copilot no devolvió respuesta final." : "Copilot devolvió respuestas finales ambiguas.");
  const final = finals[0]!;
  const response = responseText(final);
  if (typeof response !== "string" || response.trim() === "") throw new Error("Respuesta final vacía.");
  const model = typeof final.model === "string" ? final.model : null;
  const usage = final.usage !== null && typeof final.usage === "object" ? final.usage as Record<string, unknown> : null;
  return { response, model, usage };
}

function parseEvent(line: string): CopilotEvent { const value: unknown = JSON.parse(line); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Evento JSONL no es un objeto."); return value as CopilotEvent; }
function responseText(event: CopilotEvent): unknown { if (typeof event.content === "string") return event.content; if (typeof event.data === "string") return event.data; if (event.data && typeof event.data === "object") { const data = event.data as Record<string, unknown>; return data.content ?? data.response ?? data.text; } return event.response; }
