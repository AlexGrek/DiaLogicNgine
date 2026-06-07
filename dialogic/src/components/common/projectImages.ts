/** Storage folder name for server image API paths (from HomePage project open/create). */
export function resolveImageProject(projectName?: string, fallback = 'default'): string {
    const trimmed = projectName?.trim();
    return trimmed || fallback;
}

export function projectImageApiBase(projectName: string): string {
    return `/api/v1/projects/${encodeURIComponent(projectName)}`;
}
