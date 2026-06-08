import { generateMockObservationDraft } from "./observation-draft-mock";
import type {
  Discipline,
  ObservationStatus,
  Priority,
} from "./types";

export interface ObservationDraftTranscript {
  audioId: string;
  text: string;
  filename?: string;
}

export interface ObservationDraftInput {
  title: string;
  location: string;
  discipline: Discipline;
  status: ObservationStatus;
  priority?: Priority;
  contractorActionRequired: boolean;
  note: string;
  transcripts: ObservationDraftTranscript[];
  recommendedAction?: string;
  photoCount: number;
  photoReferences?: string[];
  attachedAudioCount?: number;
}

export interface ObservationDraftSourceSummary {
  usedTypedNote: boolean;
  completedTranscriptCount: number;
  audioIdsUsed: string[];
  audioFilenames: string[];
  photoCount: number;
  existingRecommendedActionProvided: boolean;
}

export type ObservationDraftConfidence = "high" | "medium" | "low";

export interface ObservationDraftResult {
  description: string;
  recommendedAction?: string;
  confidence: ObservationDraftConfidence;
  warnings: string[];
  sourceSummary: ObservationDraftSourceSummary;
  generatedAt: string;
}

export { generateMockObservationDraft } from "./observation-draft-mock";

export function formatDraftSourceSummary(
  summary: ObservationDraftSourceSummary,
  generatedAt: string,
): string {
  const parts = [
    `Typed note: ${summary.usedTypedNote ? "yes" : "no"}`,
    `Completed transcripts: ${summary.completedTranscriptCount}`,
  ];

  if (summary.audioFilenames.length > 0) {
    parts.push(`Audio: ${summary.audioFilenames.join(", ")}`);
  } else if (summary.audioIdsUsed.length > 0) {
    parts.push(
      `Audio notes: ${summary.audioIdsUsed.length} attached`,
    );
  }

  parts.push(`Photos attached: ${summary.photoCount}`);
  parts.push(`Generated: ${new Date(generatedAt).toLocaleString()}`);

  return parts.join(" · ");
}

function isObservationDraftResult(value: unknown): value is ObservationDraftResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<ObservationDraftResult>;
  return (
    typeof result.description === "string" &&
    typeof result.confidence === "string" &&
    Array.isArray(result.warnings) &&
    typeof result.generatedAt === "string" &&
    Boolean(result.sourceSummary)
  );
}

/**
 * Client entry point: calls the server AI route, with local mock fallback on failure.
 */
export async function generateObservationDraft(
  input: ObservationDraftInput,
): Promise<ObservationDraftResult> {
  if (typeof window === "undefined") {
    return generateMockObservationDraft(input);
  }

  try {
    const response = await fetch("/api/observation-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : `Draft request failed (${response.status}).`;

      return generateMockObservationDraft(input, {
        extraWarnings: [
          `${message} Using demo drafting because the AI service is unavailable.`,
        ],
      });
    }

    if (isObservationDraftResult(payload)) {
      return payload;
    }

    return generateMockObservationDraft(input, {
      extraWarnings: [
        "Using demo drafting because the AI response could not be read.",
      ],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not reach the draft service.";

    return generateMockObservationDraft(input, {
      extraWarnings: [
        `${message} Using demo drafting because the AI service is unavailable.`,
      ],
    });
  }
}
