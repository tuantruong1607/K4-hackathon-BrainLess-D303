import { apiFetch, setToken } from "./apiClient";

export interface User {
  id: string;
  email: string;
  fullname: string;
  role: "STUDENT" | "ADMIN";
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  createdAt: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export async function login(email: string, password: string): Promise<User> {
  const res = await apiFetch<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(res.data.accessToken);
  localStorage.setItem("vlearn_refresh_token", res.data.refreshToken);
  return res.data.user;
}

export async function register(
  email: string,
  password: string,
  fullname: string,
): Promise<User> {
  const res = await apiFetch<AuthResult>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, fullname }),
  });
  setToken(res.data.accessToken);
  localStorage.setItem("vlearn_refresh_token", res.data.refreshToken);
  return res.data.user;
}

export async function getMe(): Promise<User> {
  const res = await apiFetch<User>("/auth/me");
  return res.data;
}
