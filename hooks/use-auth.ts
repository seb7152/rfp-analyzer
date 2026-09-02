"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    organization_code: string;
    role: "admin" | "evaluator" | "viewer";
    subscription_tier: "free" | "pro" | "enterprise";
    max_users: number;
    max_rfps: number;
    settings: Record<string, unknown> | null;
  }>;
}

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch("/api/auth/me", { credentials: "include" });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.user as User) ?? null;
}

/**
 * Current user + organizations.
 *
 * Backed by React Query so that the layout, the navbar and the page body
 * calling this hook on the same render share one `/api/auth/me` request
 * instead of firing one each, and so that navigating between pages reuses the
 * cached identity instead of re-authenticating.
 */
export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: user = null,
    isLoading,
    error,
  } = useQuery<User | null, Error>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 30,
    retry: false,
  });

  const setUser = useCallback(
    (nextUser: User | null) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, nextUser);
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      queryClient.clear();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, [queryClient, router, setUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Login failed");
      }

      const data = await response.json();
      setUser(data.user);
      router.push("/dashboard");
      router.refresh();
    },
    [router, setUser]
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      organizationName: string
    ) => {
      // 1. Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (authError) throw authError;

      // 2. Call API to create organization and link user
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authData.user?.id,
          email,
          fullName,
          organizationName,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Registration failed");
      }

      const data = await response.json();
      setUser(data.user);
      router.push("/dashboard");
      router.refresh();
    },
    [router, setUser]
  );

  return {
    user,
    isLoading,
    error: error ?? null,
    isAuthenticated: !!user,
    login,
    logout,
    register,
  };
}
