export type TranscriptionErrorCode =
  | "audio_not_found"
  | "audio_not_linked"
  | "observation_preparing"
  | "observation_missing"
  | "observation_orphaned"
  | "transcript_save_failed"
  | "generic";

export class TranscriptionError extends Error {
  readonly code: TranscriptionErrorCode;

  constructor(code: TranscriptionErrorCode, message: string) {
    super(message);
    this.name = "TranscriptionError";
    this.code = code;
  }
}

export const TRANSCRIPTION_USER_MESSAGES: Record<TranscriptionErrorCode, string> = {
  audio_not_found: "This audio note could not be found. Try saving again or refresh the page.",
  audio_not_linked:
    "This audio note is not linked to the current observation.",
  observation_preparing:
    "This audio note is saved, but the observation is still preparing. Please wait a moment and try again.",
  observation_missing:
    "This audio note is not linked to an observation. You can remove it and record again.",
  observation_orphaned:
    "This audio note is not linked to an observation. You can remove it and record again.",
  transcript_save_failed: "Could not save transcript to the observation.",
  generic: "Could not transcribe this audio note. Please try again.",
};

export function transcriptionErrorMessage(
  err: unknown,
  fallbackCode: TranscriptionErrorCode = "generic",
): string {
  if (err instanceof TranscriptionError) {
    return err.message;
  }
  if (err instanceof Error && err.message === "Observation not found.") {
    return TRANSCRIPTION_USER_MESSAGES.observation_preparing;
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return TRANSCRIPTION_USER_MESSAGES[fallbackCode];
}
