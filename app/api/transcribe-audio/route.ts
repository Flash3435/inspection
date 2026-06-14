import { NextResponse } from "next/server";
import {
  getAudioTranscriptionModel,
  isAudioTranscriptionConfigured,
  isSupportedAudioMimeType,
  MAX_AUDIO_TRANSCRIPTION_BYTES,
  transcribeAudioBuffer,
  TranscriptionProviderError,
} from "@/lib/audio-transcription-ai.server";
import { downloadMediaBlob, MEDIA_BUCKET } from "@/lib/supabase/media-repository";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface TranscribeAudioResponse {
  text: string;
  audioId: string;
  duration?: number;
  model: string;
  generatedAt: string;
  filename?: string;
}

interface TranscribeAudioErrorBody {
  error: string;
  code?: string;
}

function errorResponse(
  message: string,
  status: number,
  code?: string,
): NextResponse<TranscribeAudioErrorBody> {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn("[transcribe-audio] Unauthenticated request:", authError?.message);
    return errorResponse("Please sign in again.", 401, "session_expired");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.", 400, "invalid_body");
  }

  const audioId =
    typeof body === "object" &&
    body !== null &&
    "audioId" in body &&
    typeof (body as { audioId: unknown }).audioId === "string"
      ? (body as { audioId: string }).audioId.trim()
      : "";

  if (!audioId) {
    return errorResponse("audioId is required.", 400, "invalid_body");
  }

  if (!isAudioTranscriptionConfigured()) {
    console.warn("[transcribe-audio] OPENAI_API_KEY is not configured.");
    return errorResponse(
      "Transcription service is not configured.",
      503,
      "not_configured",
    );
  }

  const { data: mediaRow, error: mediaError } = await supabase
    .from("media_items")
    .select("id, type, user_id, storage_path, filename, mime_type, size")
    .eq("id", audioId)
    .maybeSingle();

  if (mediaError) {
    console.error("[transcribe-audio] media_items lookup failed:", {
      audioId,
      message: mediaError.message,
      code: mediaError.code,
    });
    return errorResponse(
      "Could not transcribe this audio note. Please try again.",
      500,
      "lookup_failed",
    );
  }

  if (!mediaRow) {
    console.warn("[transcribe-audio] Media item not found:", { audioId, userId: user.id });
    return errorResponse(
      "This audio note could not be found. Try saving again or refresh the page.",
      404,
      "audio_not_found",
    );
  }

  if (mediaRow.user_id !== user.id) {
    console.warn("[transcribe-audio] Ownership mismatch:", {
      audioId,
      userId: user.id,
    });
    return errorResponse(
      "This audio note could not be found. Try saving again or refresh the page.",
      404,
      "audio_not_found",
    );
  }

  if (mediaRow.type !== "audio") {
    console.warn("[transcribe-audio] Media item is not audio:", {
      audioId,
      type: mediaRow.type,
    });
    return errorResponse(
      "This audio note could not be found. Try saving again or refresh the page.",
      400,
      "not_audio",
    );
  }

  if (mediaRow.size <= 0) {
    return errorResponse(
      "Could not transcribe this audio note. Please try again.",
      400,
      "empty_audio",
    );
  }

  if (mediaRow.size > MAX_AUDIO_TRANSCRIPTION_BYTES) {
    return errorResponse(
      "Audio file is too large to transcribe.",
      413,
      "file_too_large",
    );
  }

  if (!isSupportedAudioMimeType(mediaRow.mime_type, mediaRow.filename)) {
    console.warn("[transcribe-audio] Unsupported audio format:", {
      audioId,
      mimeType: mediaRow.mime_type,
      filename: mediaRow.filename,
    });
    return errorResponse(
      "Could not transcribe this audio note. Please try again.",
      400,
      "unsupported_format",
    );
  }

  let audioBlob: Blob;
  try {
    audioBlob = await downloadMediaBlob(supabase, mediaRow.storage_path);
  } catch (err) {
    console.error("[transcribe-audio] Storage download failed:", {
      audioId,
      bucket: MEDIA_BUCKET,
      storagePath: mediaRow.storage_path,
      message: err instanceof Error ? err.message : String(err),
    });
    return errorResponse("Could not load the saved audio.", 502, "storage_download_failed");
  }

  if (audioBlob.size === 0) {
    return errorResponse(
      "Could not transcribe this audio note. Please try again.",
      400,
      "empty_audio",
    );
  }

  if (audioBlob.size > MAX_AUDIO_TRANSCRIPTION_BYTES) {
    return errorResponse(
      "Audio file is too large to transcribe.",
      413,
      "file_too_large",
    );
  }

  const model = getAudioTranscriptionModel();
  const generatedAt = new Date().toISOString();

  try {
    const text = await transcribeAudioBuffer({
      filename: mediaRow.filename,
      mimeType: mediaRow.mime_type,
      audio: await audioBlob.arrayBuffer(),
    });

    const response: TranscribeAudioResponse = {
      text,
      audioId,
      model,
      generatedAt,
      filename: mediaRow.filename,
    };

    console.info("[transcribe-audio] Success:", {
      audioId,
      userId: user.id,
      model,
      textLength: text.length,
      size: audioBlob.size,
    });

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof TranscriptionProviderError) {
      const status =
        err.code === "file_too_large"
          ? 413
          : err.code === "not_configured"
            ? 503
            : 502;

      console.error("[transcribe-audio] Provider error:", {
        audioId,
        code: err.code,
        message: err.message,
      });

      return errorResponse(err.message, status, err.code);
    }

    console.error("[transcribe-audio] Unexpected transcription failure:", {
      audioId,
      message: err instanceof Error ? err.message : String(err),
    });

    return errorResponse(
      "Could not transcribe this audio note. Please try again.",
      502,
      "provider_failed",
    );
  }
}
