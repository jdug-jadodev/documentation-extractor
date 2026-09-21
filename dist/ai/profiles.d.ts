export declare function generateEffectiveProfiles(options: {
    packageRoot: string;
    model: string;
    outputRoot?: string;
}): Promise<Array<{
    role: string;
    path: string;
    source_hash: string;
}>>;
