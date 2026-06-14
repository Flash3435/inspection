import { logAudio } from "@/lib/media-diagnostics";
import { getAudioMediaForTranscription } from "./media-service";
import { formatDateTime } from "./utils";

interface TranscriptionMediaOptions {
  userId?: string | null;
  client: import("@supabase/supabase-js").SupabaseClient | null;
}

const DEMO_PREFIX = "[Demo transcription] ";

/**
 * Local demo transcript when OpenAI is unavailable (development only).
 */
export async function generateDemoTranscript(
  mediaId: string,
  mediaOptions?: TranscriptionMediaOptions,
): Promise<string> {
  const media = mediaOptions
    ? await getAudioMediaForTranscription(mediaId, mediaOptions)
    : null;

  const recordedDate = media
    ? formatDateTime(media.createdAt)
    : "the recording time";

  const text = `${DEMO_PREFIX}Sample transcript for audio note recorded on ${recordedDate}. Edit this text to reflect what was said on site.`;

  logAudio("transcribe:demo_fallback", { mediaId, textLength: text.length });
  return text;
}

export function isDemoTranscriptText(text: string): boolean {
  return text.startsWith(DEMO_PREFIX);
}
