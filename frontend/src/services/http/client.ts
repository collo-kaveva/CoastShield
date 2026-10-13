import { ApiError } from "../errors";

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api/v1";

const readCookie = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.split("=")[1];

/** Django sets the CSRF cookie on first contact; unsafe requests must echo it in a header. */
async function csrfToken(): Promise<string> {
  let t = readCookie("csrftoken");
  if (!t) {
    const r = await fetch(`${BASE}/auth/csrf/`, { credentials: "include" });
    t = ((await r.json()) as { csrfToken: string }).csrfToken;
  }
  return decodeURIComponent(t);
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const unsafe = method !== "GET" && method !== "HEAD";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json"; // the browser sets the multipart boundary itself
  if (unsafe) headers["X-CSRFToken"] = await csrfToken();

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, credentials: "include", body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body) });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection and try again.", 0);
  }
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok) {
    const err = (data as { error?: { message?: string; fields?: Record<string, string> } } | null)?.error;
    throw new ApiError(err?.message ?? "Something went wrong. Please try again.", res.status, err?.fields && Object.keys(err.fields).length ? err.fields : undefined);
  }
  return data as T;
}

interface Page<T> { results: T[]; next: string | null }

/** Follows pagination so callers receive plain arrays, matching the Api contract. */
export async function fetchAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  const sep = path.includes("?") ? "&" : "?";
  for (let page = 1; page <= 50; page++) {
    const r = await request<Page<T>>("GET", `${path}${sep}page_size=200&page=${page}`);
    out.push(...r.results);
    if (!r.next) break;
  }
  return out;
}
