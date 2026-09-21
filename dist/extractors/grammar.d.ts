export declare class GrammarManager {
    #private;
    constructor(root: string);
    verifyAll(): Promise<Array<{
        language: string;
        ok: boolean;
        reason?: string;
    }>>;
    parse(language: string, source: string): Promise<{
        root: string;
        hasErrors: boolean;
    }>;
}
