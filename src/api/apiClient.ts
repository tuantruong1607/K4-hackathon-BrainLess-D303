const BASE_URL = "/api";

/**
 * Standard API response shape from the backend.
 * @see backend/src/utils/response.ts
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

function getToken(): string | null {
  return localStorage.getItem("vlearn_token");
}

function getGuestId(): string {
  let guestId = localStorage.getItem("vlearn_guest_id");
  if (!guestId) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      guestId = "guest-" + crypto.randomUUID();
    } else {
      guestId = "guest-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    localStorage.setItem("vlearn_guest_id", guestId);
  }
  return guestId;
}

export function setToken(token: string): void {
  localStorage.setItem("vlearn_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("vlearn_token");
  localStorage.removeItem("vlearn_refresh_token");
  localStorage.removeItem("vlearn_guest_id");
}

/**
 * Core fetch wrapper. Automatically attaches Bearer token and parses the
 * backend's standard { success, data, message } envelope.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    headers["X-Guest-Id"] = getGuestId();
  }


  // Only set Content-Type for JSON bodies (skip for FormData)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let json: any;
  try {
    json = await response.json();
  } catch {
    json = {};
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    // Only redirect/clear token if this isn't a login or registration attempt
    const isAuthRoute = path.startsWith("/auth/login") || path.startsWith("/auth/register");
    if (!isAuthRoute) {
      clearToken();
      throw new ApiError("Session expired. Please log in again.", 401);
    }
  }

  if (!response.ok || !json.success) {
    throw new ApiError(
      json.message || `Request failed (${response.status})`,
      response.status,
    );
  }

  return json as ApiResponse<T>;
}
