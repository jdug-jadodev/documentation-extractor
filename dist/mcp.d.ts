import { McpServer } from "@modelcontextprotocol/server";
export interface McpOptions {
    packageRoot: string;
    configPath: string;
}
export declare function buildDocumentationMcp(options: McpOptions): Promise<McpServer>;
export declare function serveDocumentationMcp(options: McpOptions): Promise<void>;
