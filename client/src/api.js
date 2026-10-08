const SESSION_KEY = "organizerToken";

export function getOrganizerToken() {
  return sessionStorage.getItem(SESSION_KEY);
}

export function setOrganizerToken(token) {
  sessionStorage.setItem(SESSION_KEY, token);
}

export function clearOrganizerToken() {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const token = getOrganizerToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}
