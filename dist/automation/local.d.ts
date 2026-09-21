export interface SchedulerInstructions {
    windows: string[];
    unix: string[];
    notes: string[];
}
export declare function schedulerInstructions(packageRoot: string, configPath: string): SchedulerInstructions;
