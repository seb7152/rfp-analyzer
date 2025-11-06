import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Params = Promise<{ organizationId: string }>

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { organizationId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Verify user belongs to this organization
    const { data: membership, error: memberError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Get organization members
    const { data: members, error: membersError } = await supabase
      .from("user_organizations")
      .select(`
        id,
        role,
        joined_at,
        user:users (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq("organization_id", organizationId)
      .order("joined_at", { ascending: false })

    if (membersError) {
      return NextResponse.json(
        { error: "Failed to fetch members", message: membersError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      members: members.map((m: any) => ({
        id: m.user.id,
        email: m.user.email,
        full_name: m.user.full_name,
        avatar_url: m.user.avatar_url,
        role: m.role,
        joined_at: m.joined_at,
        membershipId: m.id,
      })),
    })
  } catch (error: any) {
    console.error("Get members error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}
