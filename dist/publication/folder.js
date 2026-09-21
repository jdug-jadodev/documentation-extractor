import { cp, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { isContainedPath } from "../platform/paths.js";
import { verifyPublicationManifest } from "./manifest.js";
export async function copyEditionToFolder(sourceVault, manifest, destinationRoot) {
    const source = join(sourceVault, "Publicaciones", manifest.edition_id);
    const destination = join(destinationRoot, manifest.edition_id);
    if (isContainedPath(sourceVault, destinationRoot) || isContainedPath(destinationRoot, sourceVault))
        throw new Error("El destino compartido no puede solaparse con la boveda de origen.");
    await verifyPublicationManifest(source, manifest);
    await mkdir(destination, { recursive: false });
    for (const file of manifest.files) {
        const target = join(destination, ...file.path.split("/"));
        await mkdir(join(target, ".."), { recursive: true });
        await cp(join(source, ...file.path.split("/")), target, { force: false, errorOnExist: true });
    }
    await cp(join(source, "edicion.json"), join(destination, "edicion.json"), { force: false });
    await cp(join(source, ".complete"), join(destination, ".complete"), { force: false });
    await verifyPublicationManifest(destination, manifest);
    return destination;
}
//# sourceMappingURL=folder.js.map