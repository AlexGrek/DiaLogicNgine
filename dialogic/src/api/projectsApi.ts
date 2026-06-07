import { GameDescription, ENGINE_VERSION } from '../game/GameDescription';
import { loadJsonStringAndPatch } from '../game/Patches';

const BASE = '/api/v1';

export interface ProjectMeta {
  name: string;
  displayName?: string;
  authors?: string[];
  description?: string;
  version?: string;
  mainImageUrl?: string | null;
  dialogCount?: number;
  characterCount?: number;
  locationCount?: number;
  lastModified?: string;
}

export interface ProjectsPage {
  projects: ProjectMeta[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listServerProjects(page = 1): Promise<ProjectsPage> {
  const res = await fetch(`${BASE}/projects?page=${page}`);
  if (!res.ok) throw new Error(`Failed to list projects: ${res.status}`);
  return res.json();
}

export async function saveProjectToServer(name: string, game: GameDescription): Promise<void> {
  const res = await fetch(`${BASE}/projects/${encodeURIComponent(name)}/game`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(game),
  });
  if (!res.ok) throw new Error(`Failed to save project: ${res.status}`);
}

export async function loadProjectFromServer(name: string): Promise<GameDescription> {
  const res = await fetch(`${BASE}/projects/${encodeURIComponent(name)}/game`);
  if (!res.ok) throw new Error(`Failed to load project: ${res.status}`);
  const json = await res.json();
  return loadJsonStringAndPatch(JSON.stringify(json), ENGINE_VERSION);
}

export async function deleteProjectFromServer(name: string): Promise<void> {
  const res = await fetch(`${BASE}/projects/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete project: ${res.status}`);
}
