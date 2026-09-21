export interface SkillResource {
    status: "available" | "missing";
    mode: "fallback" | "archify";
    content: string | null;
    sha256: string | null;
    implementation: string | null;
    version: string | null;
}
export declare function loadArchifySkill(packageRoot: string, implementation?: {
    command: string;
    version: string;
}): Promise<SkillResource>;
