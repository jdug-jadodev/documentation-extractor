import type { DocumentModel, KnowledgeGraph } from "../contracts/types.js";
export declare function serviceDocumentPath(snapshot: DocumentModel["snapshots"][number]): string;
export declare function renderEditionIndex(model: DocumentModel): string;
export declare function renderGraphTable(graph: KnowledgeGraph): string;
