import { branchKey } from "./platform/paths.js";
export interface BranchIdentity { original: string; key: string; }
export function identifyBranches(branches: readonly string[]): BranchIdentity[] { const keys = new Set<string>(); return branches.map((original) => { const key = branchKey(original); if (keys.has(key)) throw new Error(`Colisión de clave portable para rama: ${original}`); keys.add(key); return { original, key }; }); }
