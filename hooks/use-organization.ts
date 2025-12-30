"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { useQueryClient } from "@tanstack/react-query";

const CURRENT_ORG_KEY = "current_organization_id";

export function useOrganization() {
  const { user, isLoading: userLoading } = useAuth();
  const queryClient = useQueryClient();
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize current organization from localStorage on mount
  useEffect(() => {
    if (user?.organizations && user.organizations.length > 0) {
      const storedOrgId = localStorage.getItem(CURRENT_ORG_KEY);

      // Check if stored org is valid for this user
      const validOrg = user.organizations.find((org) => org.id === storedOrgId);

      if (validOrg) {
        setCurrentOrgId(validOrg.id);
      } else {
        // Default to first organization
        const firstOrg = user.organizations[0];
        setCurrentOrgId(firstOrg.id);
        localStorage.setItem(CURRENT_ORG_KEY, firstOrg.id);
      }
      setIsLoading(false);
    } else if (!userLoading) {
      // User loading is done but no organizations
      setIsLoading(false);
    }
  }, [user, userLoading]);

  const currentOrg =
    user?.organizations?.find((org) => org.id === currentOrgId) || null;

  const switchOrganization = (organizationId: string) => {
    const org = user?.organizations?.find((o) => o.id === organizationId);

    if (!org) {
      throw new Error("Organization not found");
    }

    // Invalidate all queries and force a refetch
    queryClient.clear();

    setCurrentOrgId(organizationId);
    localStorage.setItem(CURRENT_ORG_KEY, organizationId);
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentOrg) return false;

    const role = currentOrg.role;

    // Admin has all permissions
    if (role === "admin") return true;

    // Member permissions
    if (role === "evaluator") {
      return ["view_rfp", "evaluate_rfp"].includes(permission);
    }

    // Viewer has no special permissions
    return false;
  };

  const isAdmin = currentOrg?.role === "admin";
  const isMember = currentOrg?.role === "evaluator";
  const isViewer = currentOrg?.role === "viewer";

  return {
    currentOrg,
    currentOrgId,
    organizations: user?.organizations || [],
    switchOrganization,
    hasPermission,
    isAdmin,
    isMember,
    isViewer,
    isLoading,
    canManageOrganization: isAdmin,
    canInviteUsers: isAdmin,
    canCreateRFP: isAdmin || isMember,
    canDeleteRFP: isAdmin,
    canAssignEvaluators: isAdmin,
    canViewAnalytics: isAdmin || isMember,
  };
}
