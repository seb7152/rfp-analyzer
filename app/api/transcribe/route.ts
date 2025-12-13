import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const mode = formData.get("mode") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Aucun fichier audio fourni" },
        { status: 400 }
      );
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
    n8nFormData.append("audio", audioFile);
    n8nFormData.append("mode", mode || "transcript");

    // Forward to N8N webhook
    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      body: n8nFormData,
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("N8N webhook error:", errorText);
      return NextResponse.json(
        { error: "Échec de la transcription" },
        { status: n8nResponse.status }
      );
    }

    const result = await n8nResponse.json();

    // N8N returns the transcription result directly
    // Format: { text: "...", usage: { type: "duration", seconds: 8 } }
    if (result && result.text) {
      return NextResponse.json({ text: result.text });
    }

    // Fallback if format is unexpected
    console.error("Unexpected N8N response format:", result);
    return NextResponse.json(
      { error: "Format de réponse inattendu" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la transcription" },
      { status: 500 }
    );
  }
}
