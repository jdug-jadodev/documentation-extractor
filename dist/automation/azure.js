export function azurePipelineTemplate(enginePath, configPath) {
    return `# Ejemplo opt-in; Azure está desactivado por defecto.\ntrigger: none\npr: none\npool:\n  name: <POOL_AUTOHOSPEDADO>\nsteps:\n  - checkout: none\n  - script: '"<NODE_24>" "${enginePath.replaceAll("'", "''")}" actualizar --config "${configPath.replaceAll("'", "''")}" --sin-ia --sin-publicar --no-interactivo --json'\n    displayName: Preparar documentación sin IA ni publicación\n`;
}
//# sourceMappingURL=azure.js.map