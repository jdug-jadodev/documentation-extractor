export class InvocationBudget {
    policy;
    #used = 0;
    constructor(policy) {
        this.policy = policy;
    }
    authorize(model, strong) {
        if (!this.policy.allowed_models.includes(model))
            throw new Error(`Modelo no permitido: ${model}`);
        if (strong && (!this.policy.strong_authorized || this.policy.strong_model !== model))
            throw Object.assign(new Error("El modelo fuerte necesita autorización expresa."), { code: "AWAITING_CONFIRMATION" });
        if (this.#used >= this.policy.max_invocations)
            throw Object.assign(new Error("Límite de invocaciones agotado; el trabajo permanece reanudable."), { code: "AWAITING_CONFIRMATION" });
        this.#used += 1;
    }
    get used() { return this.#used; }
    get remaining() { return Math.max(0, this.policy.max_invocations - this.#used); }
}
//# sourceMappingURL=budget.js.map