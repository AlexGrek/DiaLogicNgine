const BASE = '/api/v1/auth';

export interface AuthUser {
  username: string;
}

async function authRequest(path: string, body?: unknown): Promise<AuthUser> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(detail);
  }
  return res.json();
}

/** Return the logged-in user, or null when no valid session cookie is present. */
export async function getMe(): Promise<AuthUser | null> {
  const res = await fetch(`${BASE}/me`);
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Failed to fetch session: ${res.status}`);
  return res.json();
}

export function login(username: string, password: string): Promise<AuthUser> {
  return authRequest('/login', { username, password });
}

export function register(username: string, password: string): Promise<AuthUser> {
  return authRequest('/register', { username, password });
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/logout`, { method: 'POST' });
}

export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${BASE}/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(detail);
  }
}
