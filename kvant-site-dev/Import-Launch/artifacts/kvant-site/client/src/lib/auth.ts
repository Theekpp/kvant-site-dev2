import axios from "axios";
import api from "./api";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export async function login(email: string, password: string) {
  const { data } = await api.post("/api/auth/login", { email, password });
  setAccessToken(data.accessToken);
  return data;
}

export async function logout() {
  try {
    await api.post("/api/auth/logout");
  } finally {
    clearAccessToken();
  }
}

export async function getMe() {
  const { data } = await api.get("/api/auth/me");
  return data;
}

export async function tryRefreshToken(): Promise<boolean> {
  try {
    const { data } = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}
