import type { DocumentModel, Fact, KnowledgeGraph } from "../contracts/types.js";
export declare function buildCandidateVault(root: string, model: DocumentModel, graph: KnowledgeGraph, serviceModels?: ReadonlyMap<string, DocumentModel>, facts?: readonly Fact[]): Promise<void>;
