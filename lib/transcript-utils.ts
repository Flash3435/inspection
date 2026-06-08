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
