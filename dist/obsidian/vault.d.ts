import type { DocumentModel, Fact, KnowledgeGraph } from "../contracts/types.js";
export interface ScopedFlowDocument {
    method: string;
    path: string;
    handler: string;
    source_path: string;
    slug: string;
    markdown: string;
}
export interface RepositoryProfileOverride {
    type?: string;
    label?: string;
    domain?: string;
}
export type RepositoryProfileOverrides = Readonly<Record<string, RepositoryProfileOverride>>;
export declare function buildCandidateVault(root: string, model: DocumentModel, graph: KnowledgeGraph, serviceModels?: ReadonlyMap<string, DocumentModel>, facts?: readonly Fact[], profileOverrides?: RepositoryProfileOverrides): Promise<void>;
/** Renders exactly one already-indexed HTTP flow; it never reads an application repository. */
export declare function renderScopedFlowDocumentation(repositoryId: string, method: string, path: string, facts: readonly Fact[]): ScopedFlowDocument;
