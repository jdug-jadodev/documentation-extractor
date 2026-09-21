import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import type { PublicationManifest } from "../contracts/types.js";
import { verifyPublicationManifest } from "./manifest.js";

export async function exportEditionZip(sourceVault: string, manifest: PublicationManifest, destinationZip: string): Promise<void> {
  const source = join(sourceVault, "Publicaciones", manifest.edition_id); await verifyPublicationManifest(source, manifest);
  const files: Record<string, Uint8Array> = {};
  for (const file of manifest.files) files[`${manifest.edition_id}/${file.path}`] = await readFile(join(source, ...file.path.split("/")));
  files[`${manifest.edition_id}/edicion.json`] = strToU8(`${JSON.stringify(manifest, null, 2)}\n`);
  files[`${manifest.edition_id}/.complete`] = strToU8(`${manifest.edition_id}\n`);
  await mkdir(join(destinationZip, ".."), { recursive: true }); await writeFile(destinationZip, zipSync(files, { level: 6 }), { flag: "wx", mode: 0o600 });
}
