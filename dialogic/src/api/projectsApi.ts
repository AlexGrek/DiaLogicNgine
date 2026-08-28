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
  /** Listed in the public gallery and playable without an account. */
  published?: boolean;
  publishedAt?: string | null;
}

export interface ProjectsPage {
  projects: ProjectMeta[];
  total: number;
  page: number;
  pageSize: number;
}

/** Error carrying the HTTP status, so callers can tell 403 (unpublished) from 404. */
export class ProjectRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ProjectRequestError';
    this.status = status;
  }
}

export async function listServerProjects(page = 1): Promise<ProjectsPage> {
  const res = await fetch(`${BASE}/projects?page=${page}`);
  if (!res.ok) throw new ProjectRequestError(res.status, `Failed to list projects: ${res.status}`);
  return res.json();
}

/** Public gallery listing — no session required. */
export async function listPublishedGames(page = 1, search = ''): Promise<ProjectsPage> {
  const query = new URLSearchParams({ page: String(page) });
  if (search.trim()) query.set('search', search.trim());
  const res = await fetch(`${BASE}/projects/published?${query.toString()}`);
  if (!res.ok)
    throw new ProjectRequestError(res.status, `Failed to list published games: ${res.status}`);
  return res.json();
}

export async function setProjectPublished(
  name: string,
  published: boolean
): Promise<{ name: string; published: boolean; publishedAt: string | null }> {
  const res = await fetch(`${BASE}/projects/${encodeURIComponent(name)}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ published }),
  });
  if (!res.ok)
    throw new ProjectRequestError(res.status, `Failed to change publication: ${res.status}`);
  return res.json();
}

export async function saveProjectToServer(name: string, game: GameDescription): Promise<void> {
  const res = await fetch(`${BASE}/projects/${encodeURIComponent(name)}/game`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(game),
  });
  if (!res.ok) throw new ProjectRequestError(res.status, `Failed to save project: ${res.status}`);
}

export async function loadProjectFromServer(name: string): Promise<GameDescription> {
  const res = await fetch(`${BASE}/projects/${encodeURIComponent(name)}/game`);
  if (!res.ok) throw new ProjectRequestError(res.status, `Failed to load project: ${res.status}`);
  const json = await res.json();
  return loadJsonStringAndPatch(JSON.stringify(json), ENGINE_VERSION);
}

export async function deleteProjectFromServer(name: string): Promise<void> {
  const res = await fetch(`${BASE}/projects/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new ProjectRequestError(res.status, `Failed to delete project: ${res.status}`);
}

/**
 * Cover image for a project card. `mainImageUrl` in the metadata is whatever the
 * game stores as its start-menu background: an absolute URL, a bundled asset
 * path, or a bare filename uploaded to that project — the last case needs the
 * per-project image route.
 */
export function projectCoverUrl(
  projectName: string,
  mainImageUrl?: string | null,
  thumbnail = true
): string | null {
  if (!mainImageUrl) return null;
  if (/^(https?:)?\/\//.test(mainImageUrl) || mainImageUrl.startsWith('/')) return mainImageUrl;
  if (mainImageUrl.startsWith('game_assets/')) return `/${mainImageUrl}`;
  const route = thumbnail ? 'image_thumbs' : 'images';
  return `${BASE}/projects/${encodeURIComponent(projectName)}/${route}/${encodeURIComponent(
    mainImageUrl
  )}`;
}
