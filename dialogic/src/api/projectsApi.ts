import { GameDescription, ENGINE_VERSION } from '../game/GameDescription';
import { loadJsonStringAndPatch } from '../game/Patches';

const BASE = '/api/v1';

export async function listServerProjects(): Promise<string[]> {
  const res = await fetch(`${BASE}/projects`);
  if (!res.ok) throw new Error(`Failed to list projects: ${res.status}`);
  const data = await res.json();
  return data.projects as string[];
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
