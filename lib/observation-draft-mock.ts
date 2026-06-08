import { DISCIPLINE_LABELS } from "./constants";
import {
  assessDraftConfidence,
  buildSourceSummary,
  collectDraftWarnings,
  combineSourceMaterial,
  mergeWarnings,
} from "./observation-draft-shared";
import type {
  ObservationDraftInput,
  ObservationDraftResult,
} from "./observation-drafting";

export interface MockDraftOptions {
  extraWarnings?: string[];
}

export function generateMockObservationDraft(
  input: ObservationDraftInput,
  options: MockDraftOptions = {},
): ObservationDraftResult {
  const title = input.title.trim() || "the observed condition";
  const location = input.location.trim();
  const note = input.note.trim();
  const completedTranscripts = input.transcripts.filter((t) => t.text.trim());
  const sourceMaterial = combineSourceMaterial(note, completedTranscripts);
  const condition = deriveConditionText(sourceMaterial, title);
  const locationPhrase = location ? ` at ${location}` : "";

  const sourceSummary = buildSourceSummary(input);
  const warnings = mergeWarnings(
    collectDraftWarnings(input, sourceMaterial, completedTranscripts),
    options.extraWarnings ?? [],
  );
  const confidence = assessDraftConfidence(
    sourceMaterial,
    completedTranscripts,
    note,
  );

  const description = buildDescription(
    input.status,
    condition,
    locationPhrase,
    sourceMaterial,
    input.discipline,
  );

  const recommendedAction = resolveRecommendedAction(
    input,
    condition,
    location,
    sourceMaterial,
    warnings,
  );

  return {
    description,
    recommendedAction,
    confidence,
    warnings,
    sourceSummary,
    generatedAt: new Date().toISOString(),
  };
}

function deriveConditionText(sourceMaterial: string, title: string): string {
  if (sourceMaterial.length >= 20) {
    return normalizeCondition(sourceMaterial);
  }
  return normalizeCondition(title);
}

function normalizeCondition(text: string): string {
  let cleaned = text.trim().replace(/\s+/g, " ");
  cleaned = cleaned.replace(/^(voice note:|field note:)\s*/i, "");
  cleaned = cleaned.replace(/\.$/, "");
  return softenCertainty(cleaned);
}

function softenCertainty(text: string): string {
  if (/\b(maybe|possibly|unclear|might|appears to|appeared to)\b/i.test(text)) {
    if (!/^it appeared that/i.test(text)) {
      return `it appeared that ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    }
  }
  return text;
}

function buildDescription(
  status: ObservationDraftInput["status"],
  condition: string,
  locationPhrase: string,
  sourceMaterial: string,
  discipline: ObservationDraftInput["discipline"],
): string {
  const disciplineLabel = DISCIPLINE_LABELS[discipline].toLowerCase();

  switch (status) {
    case "deficiency":
      return buildDeficiencyDescription(
        condition,
        locationPhrase,
        sourceMaterial,
      );
    case "follow-up":
      return `Further review is recommended to confirm ${condition}${locationPhrase}. The contractor should confirm resolution status and provide supporting documentation as applicable.`;
    case "progress":
      return buildProgressDescription(condition, locationPhrase, disciplineLabel);
    case "general":
    default:
      return `During the site visit, ${condition} was observed${locationPhrase}. This ${disciplineLabel} observation was recorded for project documentation purposes.`;
  }
}

function buildDeficiencyDescription(
  condition: string,
  locationPhrase: string,
  sourceMaterial: string,
): string {
  const lead = `During the site observation, it was noted that ${condition}${locationPhrase}`;
  const needsFollowUp =
    /\b(not (yet|complete|installed|labelled|labeled|removed|demolished)|missing|incomplete|disconnected|pending|outstanding)\b/i.test(
      sourceMaterial,
    );

  if (needsFollowUp) {
    return `${lead}. Corrective action and confirmation of completion may be required prior to further review.`;
  }

  return `${lead}.`;
}

function buildProgressDescription(
  condition: string,
  locationPhrase: string,
  disciplineLabel: string,
): string {
  if (condition.length < 40) {
    return `Work in this area appeared to be in progress at the time of the site visit${locationPhrase}. The following ${disciplineLabel} condition was observed: ${condition}.`;
  }

  return `At the time of the site visit, the following progress condition was observed${locationPhrase}: ${condition}. Work in this area appeared to be ongoing.`;
}

function resolveRecommendedAction(
  input: ObservationDraftInput,
  condition: string,
  location: string,
  sourceMaterial: string,
  warnings: string[],
): string | undefined {
  if (input.recommendedAction?.trim()) {
    return input.recommendedAction.trim();
  }

  const locationSuffix = location ? ` at ${location}` : "";

  if (input.status === "deficiency" || input.contractorActionRequired) {
    const inferred = inferContractorAction(
      sourceMaterial,
      condition,
      locationSuffix,
    );
    if (inferred) return inferred;
    if (input.status === "deficiency" || input.contractorActionRequired) {
      warnings.push("Recommended action could not be inferred confidently.");
    }
    return `The contractor shall review this condition${locationSuffix}, complete applicable corrective work, and provide photographic or written confirmation upon completion.`;
  }

  if (input.status === "follow-up") {
    return `The contractor should confirm the status of this item${locationSuffix} and advise when verification may be performed.`;
  }

  return undefined;
}

function inferContractorAction(
  sourceMaterial: string,
  condition: string,
  locationSuffix: string,
): string | undefined {
  const source = `${sourceMaterial} ${condition}`.toLowerCase();

  if (/\b(label|labelling|labeling)\b/.test(source)) {
    return `The contractor shall label the affected devices${locationSuffix} with typeset adhesive labels and confirm completion in writing.`;
  }

  if (
    /\b(photo|photograph|picture)\b/.test(source) &&
    /\b(complet|demolish|remov|patch)\b/.test(source)
  ) {
    return `The contractor shall provide photographic evidence upon completion of the associated work${locationSuffix}.`;
  }

  if (/\b(install|missing|not installed)\b/.test(source)) {
    return `The contractor shall review installation requirements${locationSuffix}, complete the outstanding work, and confirm corrective action.`;
  }

  if (/\b(schedule|panel|drawing|document|letter|report)\b/.test(source)) {
    return `The contractor shall provide the requested documentation${locationSuffix} for review prior to further progress.`;
  }

  return undefined;
}
