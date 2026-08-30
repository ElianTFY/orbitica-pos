const API_BASE = typeof window !== "undefined" ? "/api/v1" : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1");

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
    options: RequestInit = {}
  ): Promise<{ success: boolean; data: T; message?: string }> {
    const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    // Include credentials so HttpOnly refresh cookie is sent
    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: "include",
    };

    let response = await fetch(url, fetchOptions);

    // If 401 Unauthorized, try refresh once
    if (response.status === 401 && endpoint !== "/auth/login" && endpoint !== "/auth/refresh") {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${this.accessToken}`;
        response = await fetch(url, { ...fetchOptions, headers });
      }
    }

    const json = await response.json();

    if (!response.ok) {
      const errorMsg = json?.error?.message || "Ha ocurrido un error en la solicitud";
      const errorCode = json?.error?.code || "UNKNOWN_ERROR";
      const error = new Error(errorMsg) as Error & { code: string; status: number };
      error.code = errorCode;
      error.status = response.status;
      throw error;
    }

    return json;
  }

  async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.data?.access_token) {
        this.setToken(data.data.access_token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const api = new ApiClient();
