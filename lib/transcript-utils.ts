import type { AudioTranscript } from "./types";

export function pruneTranscripts(
  transcripts: Record<string, AudioTranscript>,
  audioIds: string[],
): Record<string, AudioTranscript> {
  const validIds = new Set(audioIds);
  return Object.fromEntries(
    Object.entries(transcripts).filter(([audioId]) => validIds.has(audioId)),
  );
}

export function getCompletedTranscriptTexts(
  transcripts: Record<string, AudioTranscript>,
): string[] {
  return Object.values(transcripts)
    .filter((t) => t.status === "completed" && t.text.trim())
    .map((t) => t.text.trim());
}

export function createTranscriptEntry(
  audioId: string,
  overrides: Partial<AudioTranscript> = {},
): AudioTranscript {
  const now = new Date().toISOString();
  return {
    audioId,
    text: "",
    status: "not_started",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function getTranscriptForAudio(
  transcripts: Record<string, AudioTranscript>,
  audioId: string,
): AudioTranscript | undefined {
  const entry = transcripts[audioId];
  if (!entry || entry.audioId !== audioId) return undefined;
  return entry;
}

export function hasCompletedTranscript(
  transcripts: Record<string, AudioTranscript>,
  audioId: string,
): boolean {
  const entry = getTranscriptForAudio(transcripts, audioId);
  return entry?.status === "completed" && Boolean(entry.text?.trim());
}

/** JSON-safe transcript entry for Postgres jsonb (no undefined values). */
export function serializeTranscriptEntry(
  transcript: AudioTranscript,
  options?: { clearError?: boolean },
): AudioTranscript {
  const entry: AudioTranscript = {
    audioId: transcript.audioId,
    text: transcript.text,
    status: transcript.status,
  };
  if (!options?.clearError && transcript.error) {
    entry.error = transcript.error;
  }
  if (transcript.createdAt) entry.createdAt = transcript.createdAt;
  if (transcript.updatedAt) entry.updatedAt = transcript.updatedAt;
  return entry;
}

export function serializeTranscriptsForDb(
  transcripts: Record<string, AudioTranscript>,
): Record<string, AudioTranscript> {
  return Object.fromEntries(
    Object.entries(transcripts).map(([audioId, transcript]) => [
      audioId,
      serializeTranscriptEntry(transcript),
    ]),
  );
}
