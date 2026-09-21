import { branchKey } from "./platform/paths.js";
export function identifyBranches(branches) { const keys = new Set(); return branches.map((original) => { const key = branchKey(original); if (keys.has(key))
    throw new Error(`Colisión de clave portable para rama: ${original}`); keys.add(key); return { original, key }; }); }
//# sourceMappingURL=branches.js.map