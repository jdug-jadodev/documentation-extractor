export const ACCEPTANCE_CASES = [
  ...Array.from({ length: 112 }, (_, index) => ({ id: `P${String(index + 1).padStart(2, "0")}`, suite: "functional" as const, status: "pending" as const })),
  ...Array.from({ length: 16 }, (_, index) => ({ id: `N${String(index + 1).padStart(2, "0")}`, suite: "node-migration" as const, status: "pending" as const })),
];

export const MANUAL_OR_EXTERNAL_CASES = new Set(["P03", "P04", "P61", "P63", "P74", "P96", "P97", "P98", "P99", "P100", "P106", "P107", "P108", "P109", "N01", "N02", "N09", "N11", "N12", "N13", "N15", "N16"]);
