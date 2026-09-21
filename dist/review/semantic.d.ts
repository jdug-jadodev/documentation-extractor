import type { TaskPacket } from "../contracts/types.js";
import type { ReviewIssue } from "./validators.js";
export declare function selectSemanticReview(issues: readonly ReviewIssue[], basePacket: TaskPacket): TaskPacket | null;
