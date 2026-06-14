import { logAudio, logAudioError } from "@/lib/media-diagnostics";
import { generateDemoTranscript } from "./transcription-demo";
import { getAudioMediaForTranscription } from "./media-service";

export interface TranscriptionMediaOptions {
  userId?: string | null;
  client: import("@supabase/supabase-js").SupabaseClient | null;
}

interface TranscribeAudioApiResponse {
  text: string;
  audioId: string;
  duration?: number;
  model: string;
  generatedAt: string;
  filename?: string;
}

interface TranscribeAudioApiError {
  error: string;
  code?: string;
}

/**
 * Transcribe an audio media item by ID via the server-side OpenAI route.
 *
 * Falls back to demo transcription in local development when the API key
 * is not configured.
 */
export async function transcribeAudio(
  mediaId: string,
  mediaOptions?: TranscriptionMediaOptions,
): Promise<string> {
  logAudio("transcribe:start", {
    mediaId,
    hasMediaOptions: Boolean(mediaOptions),
    hasSession: Boolean(mediaOptions?.userId && mediaOptions?.client),
  });

  if (mediaOptions) {
    const media = await getAudioMediaForTranscription(mediaId, mediaOptions);
    if (!media) {
      logAudioError("transcribe:not_found", { mediaId });
      throw new Error("Could not load the saved audio for transcription.");
    }

    logAudio("transcribe:loaded", {
      mediaId,
      filename: media.filename,
      mimeType: media.mimeType,
      size: media.blob.size,
      blobType: media.blob.type || "(empty)",
    });
  }

  try {
    const response = await fetch("/api/transcribe-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioId: mediaId }),
    });

    let payload: TranscribeAudioApiResponse | TranscribeAudioApiError;
    try {
      payload = (await response.json()) as
        | TranscribeAudioApiResponse
        | TranscribeAudioApiError;
    } catch {
      throw new Error("Could not transcribe this audio note. Please try again.");
    }

    if (response.ok && "text" in payload && typeof payload.text === "string") {
      logAudio("transcribe:success", {
        mediaId,
        textLength: payload.text.length,
        model: payload.model,
      });
      return payload.text;
    }

    const apiError = payload as TranscribeAudioApiError;
    const code = apiError.code;
    const message =
      apiError.error?.trim() ||
      "Could not transcribe this audio note. Please try again.";

    if (
      (response.status === 503 || code === "not_configured") &&
      process.env.NODE_ENV !== "production"
    ) {
      logAudio("transcribe:fallback_demo", { mediaId, reason: message });
      return generateDemoTranscript(mediaId, mediaOptions);
    }

    if (response.status === 401 || code === "session_expired") {
      throw new Error("Please sign in again.");
    }

    logAudioError("transcribe:api_failed", {
      mediaId,
      status: response.status,
      code,
      message,
    });
    throw new Error(message);
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    logAudioError("transcribe:failed", { mediaId }, err);
    throw new Error("Could not transcribe this audio note. Please try again.");
  }
}
