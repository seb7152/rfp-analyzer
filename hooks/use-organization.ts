"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./use-auth"

interface Organization {
  id: string
  name: string
  slug: string
  role: "admin" | "evaluator" | "viewer"
  subscription_tier: "free" | "pro" | "enterprise"
  max_users: number
  max_rfps: number
  settings: Record<string, unknown> | null
}

const CURRENT_ORG_KEY = "current_organization_id"

export function useOrganization() {
  const { user } = useAuth()
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)

  // Initialize current organization from localStorage on mount
  useEffect(() => {
    if (user?.organizations && user.organizations.length > 0) {
      const storedOrgId = localStorage.getItem(CURRENT_ORG_KEY)

      // Check if stored org is valid for this user
      const validOrg = user.organizations.find(org => org.id === storedOrgId)

      if (validOrg) {
        setCurrentOrgId(validOrg.id)
      } else {
        // Default to first organization
        const firstOrg = user.organizations[0]
        setCurrentOrgId(firstOrg.id)
        localStorage.setItem(CURRENT_ORG_KEY, firstOrg.id)
      }
    }
  }, [user])

  const currentOrganization = user?.organizations?.find(
    org => org.id === currentOrgId
  ) || null

  const switchOrganization = (organizationId: string) => {
    const org = user?.organizations?.find(o => o.id === organizationId)

    if (!org) {
      throw new Error("Organization not found")
    }

    setCurrentOrgId(organizationId)
    localStorage.setItem(CURRENT_ORG_KEY, organizationId)
  }

  const hasPermission = (permission: string): boolean => {
    if (!currentOrganization) return false

    const role = currentOrganization.role

    // Admin has all permissions
    if (role === "admin") return true

    // Evaluator permissions
    if (role === "evaluator") {
      return ["create_rfp", "view_analytics"].includes(permission)
    }

    // Viewer has no special permissions
    return false
  }

  const isAdmin = currentOrganization?.role === "admin"
  const isEvaluator = currentOrganization?.role === "evaluator"
  const isViewer = currentOrganization?.role === "viewer"

  return {
    currentOrganization,
    organizations: user?.organizations || [],
    switchOrganization,
    hasPermission,
    isAdmin,
    isEvaluator,
    isViewer,
    canManageOrganization: isAdmin,
    canInviteUsers: isAdmin,
    canCreateRFP: isAdmin || isEvaluator,
    canDeleteRFP: isAdmin,
    canAssignEvaluators: isAdmin,
    canViewAnalytics: isAdmin || isEvaluator,
  }
}
