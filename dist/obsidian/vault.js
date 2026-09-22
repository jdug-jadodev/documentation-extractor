import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { atomicWrite } from "../platform/fs.js";
import { renderDocument, renderRelationshipMermaid, renderSectionView } from "../documentation/render.js";
import { renderEditionIndex, renderGraphTable, serviceDocumentPath } from "./navigation.js";
const VIEWS = [["00-overview.md", "resumen"], ["10-domain.md", "contexto"], ["20-contracts.md", "interfaces"], ["30-dependencies.md", "arquitectura"], ["40-data.md", "datos"], ["50-tooling.md", "despliegue_operacion"], ["60-decisions.md", "decisiones"], ["70-specs.md", "requisitos"]];
export async function buildCandidateVault(root, model, graph, serviceModels = new Map()) {
    await mkdir(root, { recursive: true });
    await atomicWrite(join(root, "BORRADOR - NO APROBADO.md"), "# BORRADOR — NO APROBADO\n\nEsta boveda es temporal y no debe compartirse como edición estable.\n");
    await atomicWrite(join(root, "Inicio.md"), renderEditionIndex(model));
    for (const snapshot of model.snapshots) {
        const serviceModel = serviceModels.get(snapshot.repository_id) ?? model;
        const serviceRoot = join(root, ...serviceDocumentPath(snapshot).split("/"));
        await mkdir(serviceRoot, { recursive: true });
        await atomicWrite(join(serviceRoot, "document.md"), renderDocument(serviceModel));
        for (const [file, section] of VIEWS)
            await atomicWrite(join(serviceRoot, file), renderSectionView(serviceModel, section));
    }
    await mkdir(join(root, "Mapas"), { recursive: true });
    await atomicWrite(join(root, "Mapas", "relaciones.md"), `# Relaciones\n\n\`\`\`mermaid\n${renderRelationshipMermaid(model)}\n\`\`\`\n\n${renderGraphTable(graph)}\n`);
}
//# sourceMappingURL=vault.js.map