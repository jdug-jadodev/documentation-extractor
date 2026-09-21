import type { ContractValidator } from "./contracts/validator.js";
export interface DemoReport {
    schema_version: 3;
    kind: "synthetic_demo";
    ai_invocations: 0;
    workspace_root: string;
    knowledge_yaml: string;
    master: {
        endpoints: number;
        relations: number;
    };
    feature: {
        endpoints: number;
        added_endpoints: number;
    };
    notices: string[];
}
export declare function runDemo(packageRoot: string, validator: ContractValidator): Promise<DemoReport>;
