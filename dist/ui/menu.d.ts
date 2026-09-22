import type { EffectiveConfiguration } from "../config.js";
export type MenuAction = "update-one" | "update-many" | "relation" | "flow" | "proposal" | "query" | "document" | "open" | "configure" | "exit";
export declare function showMainMenu(config: EffectiveConfiguration): Promise<MenuAction>;
