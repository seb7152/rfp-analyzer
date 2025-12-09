import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getRFPDocumentsBucket } from "@/lib/gcs";
import {
  saveChunk,
  allChunksExist,
  assembleChunks,
  cleanupChunks,
} from "@/lib/chunkStorage";

export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rfpId } = params;

    if (!rfpId) {
      return NextResponse.json(
        { error: "RFP ID is required" },
        { status: 400 }
      );
    }

    // Get the RFP and verify user has access
    const { data: rfp, error: rfpFetchError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpFetchError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Verify user is part of the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get form data
    const formData = await request.formData();
    const chunk = formData.get("chunk") as Blob;
    const index = parseInt(formData.get("index") as string);
    const total = parseInt(formData.get("total") as string);
    const documentId = formData.get("documentId") as string;
    const filename = formData.get("filename") as string;
    const objectName = formData.get("objectName") as string;

    if (!chunk || isNaN(index) || isNaN(total) || !documentId || !filename) {
      return NextResponse.json(
        { error: "chunk, index, total, documentId, and filename are required" },
        { status: 400 }
      );
    }

    if (!objectName) {
      return NextResponse.json(
        { error: "objectName is required" },
        { status: 400 }
      );
    }

    // Save chunk to temporary storage
    const buffer = await chunk.arrayBuffer();
    await saveChunk(documentId, index, Buffer.from(buffer));

    // Check if all chunks are received
    if (!allChunksExist(documentId, total)) {
      return NextResponse.json(
        {
          success: true,
          message: `Chunk ${index + 1}/${total} received`,
          isComplete: false,
        },
        { status: 200 }
      );
    }

    // All chunks received, assemble and upload to GCS
    try {
      const fullBuffer = await assembleChunks(documentId, total);

      // Upload to GCS
      const bucket = getRFPDocumentsBucket();
      const gcsFile = bucket.file(objectName);

      await gcsFile.save(fullBuffer, {
        metadata: {
          contentType: "application/pdf", // Default to PDF; can be made dynamic
        },
      });

      // Clean up temporary chunks
      await cleanupChunks(documentId);

      return NextResponse.json(
        {
          success: true,
          message: "All chunks received and file uploaded",
          isComplete: true,
        },
        { status: 200 }
      );
    } catch (uploadError) {
      console.error("GCS upload error during chunk assembly:", uploadError);

      // Clean up chunks on error
      try {
        await cleanupChunks(documentId);
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }

      return NextResponse.json(
        {
          error:
            uploadError instanceof Error
              ? uploadError.message
              : "Failed to upload assembled file",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Chunk upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
