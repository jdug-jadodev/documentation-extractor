import type { DocumentModel, Fact, KnowledgeGraph } from "../contracts/types.js";
export interface RepositoryProfileOverride {
    type?: string;
    label?: string;
    domain?: string;
}
export type RepositoryProfileOverrides = Readonly<Record<string, RepositoryProfileOverride>>;
export declare function buildCandidateVault(root: string, model: DocumentModel, graph: KnowledgeGraph, serviceModels?: ReadonlyMap<string, DocumentModel>, facts?: readonly Fact[], profileOverrides?: RepositoryProfileOverrides): Promise<void>;
