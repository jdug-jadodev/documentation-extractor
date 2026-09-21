export interface BudgetPolicy {
    max_invocations: number;
    strong_model: string | null;
    strong_authorized: boolean;
    allowed_models: string[];
}
export declare class InvocationBudget {
    #private;
    readonly policy: BudgetPolicy;
    constructor(policy: BudgetPolicy);
    authorize(model: string, strong: boolean): void;
    get used(): number;
    get remaining(): number;
}
