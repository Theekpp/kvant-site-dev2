import { QueryClient, QueryFunction } from "@tanstack/react-query";

// ── Admin token management ────────────────────────────────────────────────
const TOKEN_KEY = "admin_access_token";
let _token: string | null = null;

export function setAdminToken(token: string) {
  _token = token;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  _token = null;
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getAdminToken(): string | null {
  if (_token) return _token;
  const stored = sessionStorage.getItem(TOKEN_KEY);
  if (stored) { _token = stored; }
  return _token;
}

function getAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Silent token refresh ──────────────────────────────────────────────────
let _refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        clearAdminToken();
        return false;
      }
      const { accessToken } = await res.json();
      setAdminToken(accessToken);
      return true;
    } catch {
      clearAdminToken();
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

function redirectToLogin() {
  clearAdminToken();
  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
}

// ── Core fetch utilities ──────────────────────────────────────────────────
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const doFetch = () => fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeaders(),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  let res = await doFetch();

  // On 401, try to refresh once and retry
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await doFetch();
    } else {
      redirectToLogin();
      throw new Error("401: Сессия истекла");
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;

    const doFetch = () => fetch(url, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    let res = await doFetch();

    // On 401, try to refresh once and retry
    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") return null as T;
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        res = await doFetch();
      } else {
        redirectToLogin();
        throw new Error("401: Сессия истекла");
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as T;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
