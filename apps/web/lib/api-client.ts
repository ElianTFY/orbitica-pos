/**
 * Production API Client for ORBÍTICA POS
 * Communicates exclusively with the authoritative FastAPI backend.
 */

const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "/api/v1")
    : (process.env.FASTAPI_BACKEND_URL ? `${process.env.FASTAPI_BACKEND_URL}/api/v1` : "http://127.0.0.1:8000/api/v1");

const DEFAULT_TIMEOUT_MS = 15000;

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

class ApiClient {
  private accessToken: string | null = null;

  setToken(token: string | null) {
    this.accessToken = token;
  }

  getToken(): string | null {
    return this.accessToken;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit & { timeoutMs?: number; skipAuthRefresh?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: "include", // Send HttpOnly refresh cookies
      signal: options.signal || controller.signal,
    };

    try {
      let response = await fetch(url, fetchOptions);

      // If 401 Unauthorized, attempt refresh once
      if (
        response.status === 401 &&
        !options.skipAuthRefresh &&
        cleanEndpoint !== "/auth/login" &&
        cleanEndpoint !== "/auth/refresh" &&
        cleanEndpoint !== "/auth/logout"
      ) {
        const refreshed = await this.refreshToken();
        if (refreshed && this.accessToken) {
          headers["Authorization"] = `Bearer ${this.accessToken}`;
          response = await fetch(url, { ...fetchOptions, headers });
        }
      }

      const contentType = response.headers.get("content-type") || "";
      let json: any = null;
      if (contentType.includes("application/json")) {
        json = await response.json();
      } else {
        const text = await response.text();
        json = { success: response.ok, message: text, data: null };
      }

      if (!response.ok) {
        const errorMsg =
          json?.detail ||
          json?.error?.message ||
          json?.message ||
          `Error ${response.status} en la solicitud`;
        const errorCode = json?.error?.code || `HTTP_${response.status}`;
        const error = new Error(errorMsg) as Error & { code: string; status: number; details?: any };
        error.code = errorCode;
        error.status = response.status;
        error.details = json?.error?.details || json?.detail;
        throw error;
      }

      // If FastAPI returned raw data, wrap into Standard ApiResponse
      if (json && typeof json === "object" && !("success" in json)) {
        return { success: true, data: json };
      }

      return json;
    } catch (err: any) {
      if (err.name === "AbortError") {
        const timeoutError = new Error(`Tiempo de espera agotado (${timeout / 1000}s)`) as Error & {
          code: string;
          status: number;
        };
        timeoutError.code = "REQUEST_TIMEOUT";
        timeoutError.status = 408;
        throw timeoutError;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) return false;
      const json = await res.json();
      const token = json?.data?.access_token || json?.access_token;
      if (token) {
        this.setToken(token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const api = new ApiClient();
