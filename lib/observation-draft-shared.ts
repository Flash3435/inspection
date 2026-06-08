import type {
  ObservationDraftConfidence,
  ObservationDraftInput,
  ObservationDraftSourceSummary,
  ObservationDraftTranscript,
} from "./observation-drafting";

export function combineSourceMaterial(
  note: string,
  transcripts: ObservationDraftTranscript[],
): string {
  const parts: string[] = [];
  if (note.trim()) parts.push(note.trim());
  for (const transcript of transcripts) {
    if (transcript.text.trim()) parts.push(transcript.text.trim());
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function buildSourceSummary(
  input: ObservationDraftInput,
): ObservationDraftSourceSummary {
  const note = input.note.trim();
  const completedTranscripts = input.transcripts.filter((t) => t.text.trim());

  return {
    usedTypedNote: note.length > 0,
    completedTranscriptCount: completedTranscripts.length,
    audioIdsUsed: completedTranscripts.map((t) => t.audioId),
    audioFilenames: completedTranscripts
      .map((t) => t.filename?.trim())
      .filter((name): name is string => Boolean(name)),
    photoCount: input.photoCount,
    existingRecommendedActionProvided: Boolean(
      input.recommendedAction?.trim(),
    ),
  };
}

export function collectDraftWarnings(
  input: ObservationDraftInput,
  sourceMaterial: string,
  completedTranscripts: ObservationDraftTranscript[],
): string[] {
  const warnings: string[] = [];
  const hasNote = input.note.trim().length > 0;
  const hasTranscripts = completedTranscripts.length > 0;
  const hasAudio = (input.attachedAudioCount ?? 0) > 0;

  if (hasAudio && !hasTranscripts) {
    warnings.push("No completed transcript available.");
  }

  if (sourceMaterial.length < 30 || (!hasNote && !hasTranscripts)) {
    warnings.push(
      "Draft generated from limited field notes. Professional review recommended.",
    );
  }

  if (
    mentionsExplicitCodeClaim(sourceMaterial) &&
    !mentionsExplicitCodeClaim(input.note)
  ) {
    warnings.push(
      "Source notes mention compliance language. Verify wording before issue.",
    );
  }

  return [...new Set(warnings)];
}

export function assessDraftConfidence(
  sourceMaterial: string,
  completedTranscripts: ObservationDraftTranscript[],
  note: string,
): ObservationDraftConfidence {
  if (sourceMaterial.length < 30) return "low";
  if (note.trim().length > 0 && completedTranscripts.length > 0) return "high";
  if (sourceMaterial.length >= 80) return "high";
  if (note.trim().length > 0 || completedTranscripts.length > 0) {
    return "medium";
  }
  return "low";
}

export function validateDraftInput(
  input: unknown,
): { ok: true; data: ObservationDraftInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const raw = input as Partial<ObservationDraftInput>;

  if (!raw.title?.trim()) {
    return { ok: false, error: "Title is required for draft generation." };
  }

  const validStatuses = ["general", "deficiency", "follow-up", "progress"];
  if (!raw.status || !validStatuses.includes(raw.status)) {
    return { ok: false, error: "Invalid observation status." };
  }

  const validDisciplines = [
    "mechanical",
    "electrical",
    "plumbing",
    "fire_protection",
    "general",
  ];
  if (!raw.discipline || !validDisciplines.includes(raw.discipline)) {
    return { ok: false, error: "Invalid discipline." };
  }

  return {
    ok: true,
    data: {
      title: raw.title.trim(),
      location: raw.location?.trim() ?? "",
      discipline: raw.discipline,
      status: raw.status,
      priority: raw.priority,
      contractorActionRequired: Boolean(raw.contractorActionRequired),
      note: raw.note?.trim() ?? "",
      transcripts: Array.isArray(raw.transcripts)
        ? raw.transcripts
            .filter(
              (t): t is ObservationDraftTranscript =>
                Boolean(t) &&
                typeof t === "object" &&
                typeof (t as ObservationDraftTranscript).audioId === "string" &&
                typeof (t as ObservationDraftTranscript).text === "string",
            )
            .map((t) => ({
              audioId: t.audioId,
              text: t.text.trim(),
              filename: t.filename?.trim(),
            }))
            .filter((t) => t.text.length > 0)
        : [],
      recommendedAction: raw.recommendedAction?.trim(),
      photoCount: Number.isFinite(raw.photoCount) ? Number(raw.photoCount) : 0,
      photoReferences: raw.photoReferences,
      attachedAudioCount: Number.isFinite(raw.attachedAudioCount)
        ? Number(raw.attachedAudioCount)
        : 0,
    },
  };
}

export function mergeWarnings(...groups: string[][]): string[] {
  return [...new Set(groups.flat().filter(Boolean))];
}

function mentionsExplicitCodeClaim(text: string): boolean {
  return /\b(code violation|non-?compliant|contravene)\b/i.test(text);
}
