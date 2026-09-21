import type { DocumentModel } from "../contracts/types.js";
export declare function renderDocument(model: DocumentModel): string;
export declare function renderSectionView(model: DocumentModel, sectionId: string): string;
export declare function renderRelationshipMermaid(model: DocumentModel): string;
