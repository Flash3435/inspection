import type { MediaType } from "@/lib/types";

export type MediaUploadStep =
  | "auth"
  | "validate"
  | "prepare"
  | "upload"
  | "db_insert"
  | "signed_url"
  | "attach";

export class MediaUploadError extends Error {
  readonly step: MediaUploadStep;
  readonly mediaType: MediaType;
  readonly cause?: unknown;

  constructor(
    step: MediaUploadStep,
    mediaType: MediaType,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "MediaUploadError";
    this.step = step;
    this.mediaType = mediaType;
    this.cause = cause;
  }
}

const LOG_PREFIX = "[media]";
const AUDIO_LOG_PREFIX = "[audio]";

function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

export function logMedia(step: string, details: Record<string, unknown>): void {
  if (typeof console === "undefined") return;
  console.info(LOG_PREFIX, step, details);
}

export function logAudio(step: string, details: Record<string, unknown>): void {
  if (typeof console === "undefined") return;
  console.info(AUDIO_LOG_PREFIX, step, details);
}

export function logAudioError(
  step: string,
  details: Record<string, unknown>,
  err?: unknown,
): void {
  if (typeof console === "undefined") return;
  console.error(AUDIO_LOG_PREFIX, step, {
    ...details,
    error: err ? safeErrorMessage(err) : undefined,
  });
}

export function logMediaError(
  step: string,
  details: Record<string, unknown>,
  err?: unknown,
): void {
  if (typeof console === "undefined") return;
  console.error(LOG_PREFIX, step, {
    ...details,
    error: err ? safeErrorMessage(err) : undefined,
  });
}

export function mapUploadErrorToUserMessage(
  err: unknown,
  mediaType: MediaType,
): string {
  if (err instanceof MediaUploadError) {
    return err.message;
  }

  const message = safeErrorMessage(err).toLowerCase();
  const label = mediaType === "photo" ? "Photo" : "Audio";

  if (
    message.includes("jwt") ||
    message.includes("session") ||
    message.includes("not authenticated") ||
    message.includes("401")
  ) {
    return "Your login session expired. Please sign in again and retry.";
  }

  if (
    message.includes("payload too large") ||
    message.includes("entity too large") ||
    message.includes("file too large") ||
    message.includes("413")
  ) {
    return `File too large. Choose a smaller ${mediaType === "photo" ? "photo" : "recording"}.`;
  }

  if (
    message.includes("foreign key") ||
    message.includes("observation_id") ||
    message.includes("violates")
  ) {
    return "Media saved but failed to attach to observation. Save the observation first, then retry.";
  }

  if (message.includes("mime") || message.includes("unsupported")) {
    return `Unsupported or empty file type for this ${mediaType}.`;
  }

  if (message.includes("network") || message.includes("fetch")) {
    return `${label} upload failed due to a network error. Check your connection and retry.`;
  }

  if (message.includes("storage") || message.includes("bucket")) {
    return `${label} upload failed during cloud storage upload.`;
  }

  return mediaType === "photo"
    ? "Photo upload failed. Please try again."
    : "Audio upload failed. Please try again.";
}

export function userMessageForStep(
  step: MediaUploadStep,
  mediaType: MediaType,
): string {
  switch (step) {
    case "auth":
      return "Your login session expired. Please sign in again and retry.";
    case "validate":
      return "Unsupported or empty file type.";
    case "upload":
      return mediaType === "photo"
        ? "Photo upload failed during cloud storage upload."
        : "Audio upload failed during cloud storage upload.";
    case "db_insert":
      return "Cloud upload succeeded but the media record failed to save.";
    case "attach":
      return "Media saved but failed to attach to observation.";
    case "signed_url":
      return "Media saved but preview URL generation failed.";
    default:
      return mapUploadErrorToUserMessage(new Error(""), mediaType);
  }
}
