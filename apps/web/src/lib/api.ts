const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "/api/cms").replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    credentials: "same-origin",
    ...init,
  });
}
