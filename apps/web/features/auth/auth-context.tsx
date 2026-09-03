"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile } from "@/types";
import { api } from "@/lib/api-client";
import { useRouter } from "next/navigation";

export interface LoginResult {
  requires2FA?: boolean;
  challengeToken?: string;
  deliveryMethod?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, pass: string, totpCode?: string) => Promise<LoginResult | void>;
  verify2FA: (challengeToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      const res = await api.request<UserProfile>("/auth/me");
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (email: string, pass: string, totpCode?: string): Promise<LoginResult | void> => {
    setIsLoading(true);
    try {
      const payload: Record<string, any> = { email, password: pass };
      if (totpCode) payload.totp_code = totpCode.trim();

      const res = await api.request<{
        access_token?: string;
        requires_2fa?: boolean;
        challenge_token?: string;
        delivery_method?: string;
        user?: UserProfile;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.data.requires_2fa) {
        return {
          requires2FA: true,
          challengeToken: res.data.challenge_token,
          deliveryMethod: res.data.delivery_method,
        };
      }

      if (res.data.access_token) {
        api.setToken(res.data.access_token);
      }

      if (res.data.user) {
        setUser(res.data.user);
        if (res.data.user.role === "superadmin") {
          router.push("/superadmin");
          return;
        }
      } else {
        await fetchProfile();
      }
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const verify2FA = async (challengeToken: string, code: string) => {
    setIsLoading(true);
    try {
      const res = await api.request<{ access_token: string }>("/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify({
          challenge_token: challengeToken,
          code: code.trim(),
        }),
      });

      api.setToken(res.data.access_token);
      await fetchProfile();
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.request("/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    } finally {
      api.setToken(null);
      setUser(null);
      router.push("/login");
    }
  };

  const hasPermission = (perm: string): boolean => {
    if (!user) return false;
    if (user.role === "superadmin") return true;
    return user.permissions.includes("*") || user.permissions.includes(perm);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        verify2FA,
        logout,
        hasPermission,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
