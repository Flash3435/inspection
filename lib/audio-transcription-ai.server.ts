import "server-only";

import OpenAI from "openai";

const DEFAULT_MODEL = "whisper-1";

/** OpenAI Whisper API limit (25 MB). */
export const MAX_AUDIO_TRANSCRIPTION_BYTES = 25 * 1024 * 1024;

const SUPPORTED_MIME_TYPES = new Set([
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/aac",
  "audio/x-m4a",
  "audio/m4a",
]);

const SUPPORTED_EXTENSIONS = new Set(["m4a", "mp4", "mp3", "wav", "webm", "ogg", "aac"]);

export function getAudioTranscriptionModel(): string {
  return process.env.AUDIO_TRANSCRIPTION_MODEL?.trim() || DEFAULT_MODEL;
}

export function isAudioTranscriptionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function isSupportedAudioMimeType(mimeType: string, filename: string): boolean {
  const normalized = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (normalized && SUPPORTED_MIME_TYPES.has(normalized)) {
    return true;
  }

  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return SUPPORTED_EXTENSIONS.has(ext);
}

export async function transcribeAudioBuffer(input: {
  filename: string;
  mimeType: string;
  audio: ArrayBuffer;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new TranscriptionProviderError(
      "not_configured",
      "Transcription service is not configured.",
    );
  }

  const { filename, mimeType, audio } = input;

  if (audio.byteLength === 0) {
    throw new TranscriptionProviderError(
      "empty_audio",
      "Could not transcribe this audio note. Please try again.",
    );
  }

  if (audio.byteLength > MAX_AUDIO_TRANSCRIPTION_BYTES) {
    throw new TranscriptionProviderError(
      "file_too_large",
      "Audio file is too large to transcribe.",
    );
  }

  if (!isSupportedAudioMimeType(mimeType, filename)) {
    throw new TranscriptionProviderError(
      "unsupported_format",
      "Could not transcribe this audio note. Please try again.",
    );
  }

  const openai = new OpenAI({ apiKey });
  const contentType = mimeType.trim() || "application/octet-stream";
  const file = new File([audio], filename, { type: contentType });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: getAudioTranscriptionModel(),
    });

    const text = transcription.text?.trim() ?? "";
    if (!text) {
      throw new TranscriptionProviderError(
        "empty_result",
        "Could not transcribe this audio note. Please try again.",
      );
    }

    return text;
  } catch (err) {
    if (err instanceof TranscriptionProviderError) {
      throw err;
    }

    const message =
      err instanceof Error ? err.message : "OpenAI transcription failed.";
    console.error("[transcribe-audio] OpenAI transcription failed:", message);

    throw new TranscriptionProviderError(
      "provider_failed",
      "Could not transcribe this audio note. Please try again.",
    );
  }
}

export type TranscriptionProviderErrorCode =
  | "not_configured"
  | "empty_audio"
  | "file_too_large"
  | "unsupported_format"
  | "empty_result"
  | "provider_failed";

export class TranscriptionProviderError extends Error {
  readonly code: TranscriptionProviderErrorCode;

  constructor(code: TranscriptionProviderErrorCode, message: string) {
    super(message);
    this.name = "TranscriptionProviderError";
    this.code = code;
  }
}
