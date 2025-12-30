import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const mode = (formData.get("mode") as string) || "transcript";

    // For text enhancement mode (AI feature), verify user is authenticated
    if (mode === "enhance") {
      const supabase = await createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Get N8N webhook URL from environment
    const webhookUrl = process.env.N8N_TRANSCRIPTION_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("N8N_TRANSCRIPTION_WEBHOOK_URL is not configured");
      return NextResponse.json(
        { error: "Service de transcription non configuré" },
        { status: 500 }
      );
    }

    // Create new FormData for N8N
    const n8nFormData = new FormData();
    n8nFormData.append("mode", mode);

    if (mode === "enhance") {
      // Text enhancement mode
      const currentText = formData.get("currentText") as string;
      const responseText = formData.get("responseText") as string;
      const requirementText = formData.get("requirementText") as string;
      const supplierName = formData.get("supplierName") as string;
      const supplierNames = formData.get("supplierNames") as string;

      if (!currentText) {
        return NextResponse.json(
          { error: "Aucun texte à améliorer" },
          { status: 400 }
        );
      }

      n8nFormData.append("currentText", currentText);
      n8nFormData.append("responseText", responseText || "");
      n8nFormData.append("requirementText", requirementText || "");
      n8nFormData.append("supplierName", supplierName || "");
      n8nFormData.append("supplierNames", supplierNames || "[]");
      // Add dummy audio for compatibility
      n8nFormData.append("audio", new Blob([""]), "dummy.txt");
    } else {
      // Transcription mode
      if (!audioFile) {
        return NextResponse.json(
          { error: "Aucun fichier audio fourni" },
          { status: 400 }
        );
      }
      n8nFormData.append("audio", audioFile);
    }

    // Forward to N8N webhook
    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      body: n8nFormData,
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("N8N webhook error:", errorText);
      return NextResponse.json(
        {
          error:
            mode === "enhance"
              ? "Échec de l'amélioration"
              : "Échec de la transcription",
        },
        { status: n8nResponse.status }
      );
    }

    const result = await n8nResponse.json();

    // N8N returns the result in different formats:
    // Format 1 (direct): { text: "...", usage: { type: "duration", seconds: 8 } }
    // Format 2 (wrapped): { output: { text: "..." } }
    let responseText = null;

    if (result?.output?.text) {
      // Format 2: wrapped in output object
      responseText = result.output.text;
    } else if (result?.text) {
      // Format 1: direct text field
      responseText = result.text;
    }

    if (responseText) {
      return NextResponse.json({ text: responseText });
    }

    // Fallback if format is unexpected
    console.error("Unexpected N8N response format:", result);
    return NextResponse.json(
      { error: "Format de réponse inattendu" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Transcription/Enhancement error:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement" },
      { status: 500 }
    );
  }
}
