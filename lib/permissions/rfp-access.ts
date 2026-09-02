import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export type RFPAccessLevel = "owner" | "evaluator" | "viewer" | "admin";

export interface RFPAccessResult {
  hasAccess: boolean;
  accessLevel?: RFPAccessLevel;
  organizationId?: string;
  error?: string;
}

/**
 * Short-lived in-memory cache for RFP access checks.
 *
 * A single page load fires up to ~10 parallel API calls for the same RFP, and
 * each one used to re-run the same 3 sequential Supabase round-trips. The cache
 * collapses that burst into a single check.
 *
 * Two layers:
 *  - in-flight map: concurrent checks for the same (user, rfp) share one promise
 *  - TTL map: results are reused for ACCESS_CACHE_TTL_MS
 *
 * The TTL is deliberately short: revoking a user's access takes effect within
 * that window at worst. Same trade-off already made in
 * `lib/suppliers/status-cache.ts`.
 */
const ACCESS_CACHE_TTL_MS = 10_000;

type CacheEntry = { result: RFPAccessResult; fetchedAt: number };

const accessCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<RFPAccessResult>>();

function cacheKey(rfpId: string, userId: string) {
  return `${userId}:${rfpId}`;
}

/**
 * Drop cached access decisions. Call after mutating assignments or memberships.
 */
export function invalidateRFPAccessCache(rfpId?: string, userId?: string) {
  if (!rfpId && !userId) {
    accessCache.clear();
    return;
  }

  for (const key of Array.from(accessCache.keys())) {
    const [cachedUserId, cachedRfpId] = key.split(":");
    if (
      (!rfpId || cachedRfpId === rfpId) &&
      (!userId || cachedUserId === userId)
    ) {
      accessCache.delete(key);
    }
  }
}

async function fetchRFPAccess(
  rfpId: string,
  userId: string
): Promise<RFPAccessResult> {
  try {
    const supabase = await createServerClient();

    // The RFP row and the (optional) explicit assignment are independent, so
    // fetch them together instead of waiting for the first before starting the
    // second.
    const [rfpResult, assignmentResult] = await Promise.all([
      supabase
        .from("rfps")
        .select("id, organization_id")
        .eq("id", rfpId)
        .maybeSingle(),
      supabase
        .from("rfp_user_assignments")
        .select("access_level")
        .eq("rfp_id", rfpId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const rfp = rfpResult.data;
    if (rfpResult.error || !rfp) {
      return { hasAccess: false, error: "RFP not found" };
    }

    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle();

    if (!userOrg) {
      return {
        hasAccess: false,
        organizationId: rfp.organization_id,
        error: "User not in RFP organization",
      };
    }

    if (userOrg.role === "admin") {
      return {
        hasAccess: true,
        accessLevel: "admin",
        organizationId: rfp.organization_id,
      };
    }

    const assignment = assignmentResult.data;
    if (!assignment) {
      return {
        hasAccess: false,
        organizationId: rfp.organization_id,
        error: "User not assigned to this RFP",
      };
    }

    return {
      hasAccess: true,
      accessLevel: assignment.access_level as RFPAccessLevel,
      organizationId: rfp.organization_id,
    };
  } catch (error) {
    return {
      hasAccess: false,
      error: error instanceof Error ? error.message : "Internal server error",
    };
  }
}

/**
 * Check if a user has access to a specific RFP
 * Returns { hasAccess: boolean, accessLevel?: string, error?: string }
 */
export async function checkRFPAccess(
  rfpId: string,
  userId: string
): Promise<RFPAccessResult> {
  const key = cacheKey(rfpId, userId);
  const now = Date.now();

  const cached = accessCache.get(key);
  if (cached && now - cached.fetchedAt < ACCESS_CACHE_TTL_MS) {
    return cached.result;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }

  const promise = fetchRFPAccess(rfpId, userId)
    .then((result) => {
      accessCache.set(key, { result, fetchedAt: Date.now() });
      return result;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/**
 * Middleware to verify RFP access in API routes
 * Returns NextResponse with 401/403/404 if no access, null if access granted
 */
export async function verifyRFPAccess(
  rfpId: string,
  userId: string,
  requiredLevel?: RFPAccessLevel
): Promise<NextResponse | null> {
  const { hasAccess, accessLevel, error } = await checkRFPAccess(rfpId, userId);

  if (!hasAccess) {
    if (error?.includes("not found")) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Check if access level meets requirement (if specified)
  if (requiredLevel && requiredLevel !== "admin") {
    const accessLevels: Record<string, number> = {
      owner: 3,
      evaluator: 2,
      viewer: 1,
      admin: 4,
    };

    const userLevel = accessLevels[accessLevel || "viewer"] || 0;
    const requiredAccessLevel = accessLevels[requiredLevel] || 0;

    if (userLevel < requiredAccessLevel) {
      return NextResponse.json(
        { error: "Insufficient permissions for this RFP" },
        { status: 403 }
      );
    }
  }

  // Access granted
  return null;
}
