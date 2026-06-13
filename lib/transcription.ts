import { logAudio, logAudioError } from "@/lib/media-diagnostics";
import { getAudioMediaForTranscription } from "./media-service";
import { formatDateTime } from "./utils";

export interface TranscriptionMediaOptions {
  userId?: string | null;
  client: import("@supabase/supabase-js").SupabaseClient | null;
}

/**
 * Transcribe an audio media item by ID.
 *
 * Loads audio from storage by mediaId — does not depend on browser playback.
 * TODO: Replace the mock implementation below with a real speech-to-text provider.
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

  const media = mediaOptions
    ? await getAudioMediaForTranscription(mediaId, mediaOptions)
    : null;

  if (mediaOptions && !media) {
    logAudioError("transcribe:not_found", { mediaId });
    throw new Error("Audio file not found.");
  }

  if (media) {
    logAudio("transcribe:loaded", {
      mediaId,
      filename: media.filename,
      mimeType: media.mimeType,
      size: media.blob.size,
      blobType: media.blob.type || "(empty)",
    });
  }

  try {
    await delay(1200);

    const recordedDate = media
      ? formatDateTime(media.createdAt)
      : "the recording time";
    const text = `Sample transcript for audio note recorded on ${recordedDate}. Edit this text to reflect what was said on site.`;

    logAudio("transcribe:success", { mediaId, textLength: text.length });
    return text;
  } catch (err) {
    logAudioError("transcribe:failed", { mediaId }, err);
    throw err;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
