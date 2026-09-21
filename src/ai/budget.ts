export interface BudgetPolicy { max_invocations: number; strong_model: string | null; strong_authorized: boolean; allowed_models: string[]; }
export class InvocationBudget {
  #used = 0;
  constructor(readonly policy: BudgetPolicy) {}
  authorize(model: string, strong: boolean): void {
    if (!this.policy.allowed_models.includes(model)) throw new Error(`Modelo no permitido: ${model}`);
    if (strong && (!this.policy.strong_authorized || this.policy.strong_model !== model)) throw Object.assign(new Error("El modelo fuerte necesita autorización expresa."), { code: "AWAITING_CONFIRMATION" });
    if (this.#used >= this.policy.max_invocations) throw Object.assign(new Error("Límite de invocaciones agotado; el trabajo permanece reanudable."), { code: "AWAITING_CONFIRMATION" });
    this.#used += 1;
  }
  get used(): number { return this.#used; }
  get remaining(): number { return Math.max(0, this.policy.max_invocations - this.#used); }
}
