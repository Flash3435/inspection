import {
  generateMockObservationDraft,
  type ObservationDraftInput,
} from "./observation-drafting";
import { buildSiteObservationReport } from "./report-utils";
import type {
  DraftTextInput,
  Observation,
  Project,
  SiteObservationReport,
} from "./types";

/** @deprecated Use generateObservationDraft from lib/observation-drafting.ts */
export async function mockGenerateDraftText(
  input: DraftTextInput,
): Promise<string> {
  const result = await generateMockObservationDraft({
    title: input.title,
    location: input.location,
    discipline: "general",
    status: input.status,
    contractorActionRequired: false,
    note: input.note,
    transcripts: input.transcripts.map((text, index) => ({
      audioId: `legacy-${index}`,
      text,
    })),
    photoCount: 0,
  });
  return result.description;
}

export async function mockGenerateReport(
  project: Project,
  observations: Observation[],
): Promise<SiteObservationReport> {
  await delay(800);
  return buildSiteObservationReport(project, observations);
}

export type { ObservationDraftInput };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
