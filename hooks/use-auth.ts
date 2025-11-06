"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  created_at: string
  organizations: Array<{
    id: string
    name: string
    slug: string
    role: "admin" | "evaluator" | "viewer"
    subscription_tier: "free" | "pro" | "enterprise"
    max_users: number
    max_rfps: number
    settings: Record<string, unknown> | null
  }>
}

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData {
  email: string
  password: string
  fullName: string
  organizationName: string
}

// Fetch current user profile
async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  })

  if (!response.ok) {
    if (response.status === 401) {
      return null
    }
    throw new Error("Failed to fetch user")
  }

  const data = await response.json()
  return data.user
}

// Login mutation
async function login(credentials: LoginCredentials) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    credentials: "include",
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || "Login failed")
  }

  return response.json()
}

// Logout mutation
async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Logout failed")
  }

  return response.json()
}

// Register mutation
async function register(data: RegisterData) {
  // 1. Create user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.fullName },
    },
  })

  if (authError) throw authError
  if (!authData.user) throw new Error("Failed to create user")

  // 2. Call API to create organization and link user
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: authData.user.id,
      email: data.email,
      fullName: data.fullName,
      organizationName: data.organizationName,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Registration failed")
  }

  return response.json()
}

export function useAuth() {
  const queryClient = useQueryClient()
  const router = useRouter()

  // Query for current user
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery<User | null>({
    queryKey: ["auth", "user"],
    queryFn: fetchUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] })
      router.push("/dashboard")
      router.refresh()
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["auth", "user"], null)
      queryClient.clear()
      router.push("/login")
      router.refresh()
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] })
      router.push("/dashboard")
      router.refresh()
    },
  })

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    register: registerMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRegistering: registerMutation.isPending,
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,
    registerError: registerMutation.error,
  }
}
