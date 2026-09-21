import { resolve } from "node:path";
export function schedulerInstructions(packageRoot, configPath) {
    const cli = resolve(packageRoot, "scripts", "cli.mjs"), config = resolve(configPath);
    return { windows: ["Programa node.exe mediante el Programador de tareas con argumentos separados.", `Programa: <ruta-absoluta-node-24>`, `Argumentos: "${cli}" actualizar --config "${config}" --sin-ia --sin-publicar --no-interactivo --json`], unix: ["Use cron/systemd solo tras revisión del administrador.", `<ruta-absoluta-node-24> '${cli}' actualizar --config '${config}' --sin-ia --sin-publicar --no-interactivo --json`], notes: ["No se crea ninguna tarea automáticamente.", "El job no ejecuta git pull, no aprueba y no publica contenido nuevo."] };
}
//# sourceMappingURL=local.js.map