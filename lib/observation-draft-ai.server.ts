import "server-only";

import { DISCIPLINE_LABELS, OBSERVATION_STATUS_LABELS, PRIORITY_LABELS } from "./constants";
import { generateMockObservationDraft } from "./observation-draft-mock";
import {
  assessDraftConfidence,
  buildSourceSummary,
  collectDraftWarnings,
  combineSourceMaterial,
  mergeWarnings,
} from "./observation-draft-shared";
import type {
  ObservationDraftConfidence,
  ObservationDraftInput,
  ObservationDraftResult,
} from "./observation-drafting";

const DEFAULT_MODEL = "gpt-4o-mini";

interface AiDraftPayload {
  description: string;
  recommendedAction?: string;
  confidence?: ObservationDraftConfidence;
  warnings?: string[];
  sourceSummary?: string;
}

export function getObservationDraftModel(): string {
  return process.env.OBSERVATION_DRAFT_MODEL?.trim() || DEFAULT_MODEL;
}

export function isObservationDraftAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function generateAiObservationDraft(
  input: ObservationDraftInput,
): Promise<ObservationDraftResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return generateMockObservationDraft(input, {
      extraWarnings: [
        "Using demo drafting because no AI key is configured.",
      ],
    });
  }

  try {
    const aiPayload = await callOpenAiDraft(apiKey, input, getObservationDraftModel());
    return assembleAiResult(input, aiPayload);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "AI draft generation failed.";
    return generateMockObservationDraft(input, {
      extraWarnings: [
        `Using demo drafting because the AI service is unavailable (${message}).`,
      ],
    });
  }
}

async function callOpenAiDraft(
  apiKey: string,
  input: ObservationDraftInput,
  model: string,
): Promise<AiDraftPayload> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    }),
  });

  if (response.status === 429) {
    throw new Error("Rate limit exceeded. Try again shortly.");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      parseOpenAiError(errorBody) ?? `OpenAI request failed (${response.status}).`,
    );
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("Empty AI response.");
  }

  return parseAiPayload(content);
}

function parseOpenAiError(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string };
    };
    return parsed.error?.message;
  } catch {
    return undefined;
  }
}

function parseAiPayload(content: string): AiDraftPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Malformed AI JSON response.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Malformed AI JSON response.");
  }

  const raw = parsed as Partial<AiDraftPayload>;
  if (!raw.description?.trim()) {
    throw new Error("AI response missing description.");
  }

  const confidence = normalizeConfidence(raw.confidence);
  const warnings = Array.isArray(raw.warnings)
    ? raw.warnings.filter((w): w is string => typeof w === "string" && w.trim().length > 0)
    : [];

  return {
    description: raw.description.trim(),
    recommendedAction: raw.recommendedAction?.trim() || undefined,
    confidence,
    warnings,
    sourceSummary: raw.sourceSummary?.trim(),
  };
}

function normalizeConfidence(
  value: unknown,
): ObservationDraftConfidence | undefined {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return undefined;
}

function assembleAiResult(
  input: ObservationDraftInput,
  ai: AiDraftPayload,
): ObservationDraftResult {
  const completedTranscripts = input.transcripts.filter((t) => t.text.trim());
  const sourceMaterial = combineSourceMaterial(input.note, completedTranscripts);
  const sourceSummary = buildSourceSummary(input);
  const heuristicWarnings = collectDraftWarnings(
    input,
    sourceMaterial,
    completedTranscripts,
  );
  const warnings = mergeWarnings(heuristicWarnings, ai.warnings ?? [], [
    "AI-assisted draft — review before issue.",
  ]);

  const confidence =
    ai.confidence ??
    assessDraftConfidence(sourceMaterial, completedTranscripts, input.note);

  const recommendedAction =
    input.recommendedAction?.trim() || ai.recommendedAction || undefined;

  if (
    !recommendedAction &&
    (input.status === "deficiency" ||
      input.status === "follow-up" ||
      input.contractorActionRequired)
  ) {
    warnings.push("Recommended action could not be inferred confidently.");
  }

  return {
    description: ai.description,
    recommendedAction,
    confidence,
    warnings: [...new Set(warnings)],
    sourceSummary,
    generatedAt: new Date().toISOString(),
  };
}

const SYSTEM_PROMPT = `You write professional Site Observation Report observation text for mechanical, electrical, plumbing, and fire protection construction site visits.

Return ONLY valid JSON with these keys:
- description (string, required): 1-3 concise report-ready sentences. No markdown, no bullet lists, no preamble.
- recommendedAction (string): contractor corrective/follow-up action when applicable; use empty string if none.
- confidence ("high" | "medium" | "low"): based on richness of provided source notes/transcripts.
- warnings (string array): include review warnings when source material is thin, transcripts missing, or engineering review is required.

Style rules by status:
- deficiency: begin with "During the site observation, it was noted that ..."
- follow-up: begin with "Further review is recommended to confirm ..."
- progress: use work-in-progress wording such as "Work in this area appeared to be in progress ..." or "The following condition was observed ..."
- general: neutral site-observation wording such as "During the site visit, ... was observed ..."

Professional constraints:
- Use ONLY facts present in the provided title, location, notes, and transcripts.
- Do NOT invent code references, measurements, equipment tags, parties, dates, drawing numbers, or deficiencies.
- Do NOT claim a code violation unless the user's notes explicitly state that.
- Use cautious language where appropriate: "appeared to," "was observed," "was noted," "reportedly," "further review may be required."
- Do not mention AI, prompts, or that text was generated.
- Keep wording suitable for an official owner/consultant site observation report.`;

function buildUserPrompt(input: ObservationDraftInput): string {
  const transcriptLines = input.transcripts
    .filter((t) => t.text.trim())
    .map(
      (t, index) =>
        `${index + 1}. ${t.filename ? `[${t.filename}] ` : ""}${t.text.trim()}`,
    );

  const lines = [
    `Title: ${input.title}`,
    `Location: ${input.location || "Not specified"}`,
    `Discipline: ${DISCIPLINE_LABELS[input.discipline]}`,
    `Status: ${OBSERVATION_STATUS_LABELS[input.status]}`,
    `Priority: ${input.priority ? PRIORITY_LABELS[input.priority] : "Not set"}`,
    `Contractor action required: ${input.contractorActionRequired ? "Yes" : "No"}`,
    `Photos attached: ${input.photoCount}`,
    `Audio files attached: ${input.attachedAudioCount ?? 0}`,
    `Existing recommended action: ${input.recommendedAction?.trim() || "None"}`,
    "",
    "Typed field notes:",
    input.note.trim() || "(none)",
    "",
    "Completed audio transcripts:",
    transcriptLines.length > 0 ? transcriptLines.join("\n") : "(none)",
  ];

  return lines.join("\n");
}
