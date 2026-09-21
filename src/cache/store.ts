import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { contentHash, sha256 } from "../platform/hash.js";

interface CacheEnvelope<T> { schema_version: 3; key: string; checksum: string; value: T; dependencies: string[]; }

export class ContentCache {
  readonly #root: string;
  constructor(root: string) { this.#root = root; }
  key(namespace: string, basis: unknown): string { return `${namespace}-${contentHash(basis)}`; }
  async get<T>(key: string): Promise<T | null> {
    const path = this.#path(key);
    try {
      const envelope = JSON.parse(await readFile(path, "utf8")) as CacheEnvelope<T>;
      if (envelope.schema_version !== 3 || envelope.key !== key || envelope.checksum !== contentHash(envelope.value)) { await rm(path, { force: true }); return null; }
      return envelope.value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") await rm(path, { force: true });
      return null;
    }
  }
  async put<T>(key: string, value: T, dependencies: string[]): Promise<void> {
    const path = this.#path(key); await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.${randomUUID()}.tmp`;
    const envelope: CacheEnvelope<T> = { schema_version: 3, key, checksum: contentHash(value), value, dependencies: [...dependencies].sort() };
    await writeFile(temporary, `${JSON.stringify(envelope)}\n`, { flag: "wx", mode: 0o600 });
    await rename(temporary, path);
  }
  #path(key: string): string { const digest = sha256(key); return join(this.#root, digest.slice(0, 2), `${digest}.json`); }
}
