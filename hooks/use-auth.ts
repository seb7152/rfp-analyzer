"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

const AUTH_KEY = ["auth", "me"] as const;

async function fetchMe(): Promise<User | null> {
  const response = await fetch("/api/auth/me", { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }
  const data = await response.json();
  return data.user as User;
}

/**
 * The signed-in user. One request per session for every component that asks
 * (React Query dedupes and caches), instead of one request per mount.
 */
export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const query = useQuery<User | null, Error>({
    queryKey: AUTH_KEY,
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const user = query.data ?? null;
  const isLoading = query.isLoading || isMutating;
  const setUser = (next: User | null) => queryClient.setQueryData(AUTH_KEY, next);
  const setIsLoading = setIsMutating;

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
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
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Login failed");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    organizationName: string
  ) => {
    try {
      setIsLoading(true);

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
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Registration failed");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    error: error ?? query.error ?? null,
    isAuthenticated: !!user,
    login,
    logout,
    register,
  };
}
