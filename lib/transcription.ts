import { getAudioMediaForTranscription } from "./media-service";
import { formatDateTime } from "./utils";

export interface TranscriptionMediaOptions {
  userId?: string | null;
  client: import("@supabase/supabase-js").SupabaseClient | null;
}

/**
 * Transcribe an audio media item by ID.
 *
 * TODO: Replace the mock implementation below with a real speech-to-text provider.
 */
export async function transcribeAudio(
  mediaId: string,
  mediaOptions?: TranscriptionMediaOptions,
): Promise<string> {
  const media = mediaOptions
    ? await getAudioMediaForTranscription(mediaId, mediaOptions)
    : null;

  if (mediaOptions && !media) {
    throw new Error("Audio file not found.");
  }

  await delay(1200);

  const recordedDate = media
    ? formatDateTime(media.createdAt)
    : "the recording time";
  return `Sample transcript for audio note recorded on ${recordedDate}. Edit this text to reflect what was said on site.`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
