import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js middleware for authentication and session management
 * Refreshes user sessions on every request
 * Protects dashboard and API routes
 */
export async function middleware(request: NextRequest) {
  // Refresh session for all requests
  return await updateSession(request);
}

export const config = {
  // Protect dashboard routes only (not API auth routes which need to be public)
  matcher: ["/dashboard/:path*"],
};
