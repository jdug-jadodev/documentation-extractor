export interface CliOptions {
    packageRoot?: string;
}
export declare function runCli(argv: string[], options?: CliOptions): Promise<number>;
