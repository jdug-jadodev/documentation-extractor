import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { EffectiveConfiguration } from "../config.js";
import { configurationState } from "../config.js";

export type MenuAction = "update-one" | "update-many" | "relation" | "flow" | "proposal" | "query" | "review" | "open" | "configure" | "exit";

export async function showMainMenu(config: EffectiveConfiguration): Promise<MenuAction> {
  const state = await configurationState(config);
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    stdout.write("\nDOCUMENTACIÓN DEL EQUIPO\n\n");
    stdout.write("1. Analizar un repositorio\n2. Analizar varios repositorios\n3. Explicar una relación\n4. Trazar un flujo\n5. Preparar propuesta\n6. Consultar hechos\n7. Preparar revisión\n8. Abrir Obsidian\n9. Configurar\n0. Salir\n\n");
    stdout.write(state === "configuration_pending" ? "Estado: Configuración pendiente. No se iniciará ningún análisis automático.\n" : "Estado: Configuración lista. Solo se ejecuta la opción que confirmes.\n");
    const answer = (await rl.question("> ")).trim();
    const actions: Record<string, MenuAction> = { "1": "update-one", "2": "update-many", "3": "relation", "4": "flow", "5": "proposal", "6": "query", "7": "review", "8": "open", "9": "configure", "0": "exit" };
    return actions[answer] ?? "exit";
  } finally { rl.close(); }
}
