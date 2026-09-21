import type { Snapshot, SnapshotEntry, SnapshotReader } from "../../src/contracts/types.js";
import { contentHash, sha256, stableId } from "../../src/platform/hash.js";

export class MemorySnapshotReader implements SnapshotReader {
  readonly snapshot: Snapshot;
  readonly #files: Map<string, Uint8Array>;
  constructor(repositoryId: string, files: Record<string, string>) {
    this.#files = new Map(Object.entries(files).map(([path, value]) => [path, Buffer.from(value, "utf8")]));
    const manifest = [...this.#files].map(([path, bytes]) => [path, sha256(bytes)]);
    this.snapshot = { schema_version: 3, id: stableId("snapshot", repositoryId, manifest), repository_id: repositoryId, requested_ref: "master", resolved_ref: "a".repeat(40), commit_oid: "a".repeat(40), capture_mode: "git", content_hash: contentHash(manifest), dirty: false, captured_at: "2026-09-21T00:00:00.000Z" };
  }
  async list(): Promise<readonly SnapshotEntry[]> { return [...this.#files].map(([path, bytes]) => ({ relative_path: path, object_id: sha256(bytes), size: bytes.byteLength, mode: "100644", kind: "blob" })); }
  async read(path: string, options: { maxBytes?: number; signal?: AbortSignal } = {}): Promise<Uint8Array> { if (options.signal?.aborted) throw new Error("cancelled"); const value = this.#files.get(path); if (!value) throw new Error(`missing: ${path}`); if (value.byteLength > (options.maxBytes ?? Number.MAX_SAFE_INTEGER)) throw new Error("too large"); return value; }
}
