export type ObservationStatus =
  | "general"
  | "deficiency"
  | "follow-up"
  | "progress";

export type MediaType = "photo" | "audio";

export type TranscriptStatus =
  | "not_started"
  | "transcribing"
  | "completed"
  | "failed";

export type Discipline =
  | "mechanical"
  | "electrical"
  | "plumbing"
  | "fire_protection"
  | "general";

export type Priority = "low" | "medium" | "high";

export type ReportTemplateType = "site_observation_report";

export interface AudioTranscript {
  audioId: string;
  text: string;
  status: TranscriptStatus;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Observation {
  id: string;
  projectId: string;
  title: string;
  location: string;
  note: string;
  photoIds: string[];
  audioIds: string[];
  transcripts: Record<string, AudioTranscript>;
  draftText: string;
  draftWarnings?: string[];
  draftGeneratedAt?: string;
  draftSourceSummary?: string;
  draftManuallyEdited?: boolean;
  status: ObservationStatus;
  discipline: Discipline;
  observationNumber?: string;
  contractorActionRequired: boolean;
  priority?: Priority;
  recommendedAction?: string;
  codeReferenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  siteName: string;
  clientName: string;
  inspectorName: string;
  inspectionDate: string;
  description: string;
  reportTemplate: ReportTemplateType;
  projectNumber?: string;
  reportNumber?: string;
  siteAddress?: string;
  buildingPermitNo?: string;
  contractorName?: string;
  preparedBy?: string;
  reviewedBy?: string;
  visitDate?: string;
  reportDate?: string;
  reasonForVisit?: string;
  weatherConditions?: string;
  /** Attendees present during the site visit (template label: Present). */
  contractorPresent?: string;
  distributionList?: string;
  /** Marks demo/sample projects seeded for evaluation. */
  isSampleProject?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionStore {
  projects: Project[];
  observations: Observation[];
}

export type ProjectInput = Omit<
  Project,
  "id" | "createdAt" | "updatedAt"
>;

export type ObservationInput = Omit<
  Observation,
  "id" | "projectId" | "createdAt" | "updatedAt" | "draftText"
> & {
  draftText?: string;
};

export interface DraftTextInput {
  title: string;
  location: string;
  status: ObservationStatus;
  note: string;
  transcripts: string[];
}

export interface ReportCoverMetadata {
  reportTitle: string;
  templateLabel: string;
  projectNumber?: string;
  reportNumber?: string;
  projectName: string;
  clientName?: string;
  siteName: string;
  siteAddress?: string;
  buildingPermitNo?: string;
  contractorName?: string;
  preparedBy?: string;
  reviewedBy?: string;
  visitDate?: string;
  reportDate?: string;
  reasonForVisit?: string;
  weatherConditions?: string;
  /** Attendees present during the site visit (template label: Present). */
  peoplePresent?: string;
  distributionList?: string;
  generatedAt: string;
}

export interface ReportObservationEntry {
  id: string;
  displayNumber: string;
  title: string;
  location: string;
  status: ObservationStatus;
  discipline: Discipline;
  reportText: string;
  recommendedAction?: string;
  contractorActionRequired: boolean;
  priority?: Priority;
  photoReferences: string[];
  photoIds: string[];
}

export interface ReportActionItem {
  displayNumber: string;
  location: string;
  discipline: Discipline;
  requiredAction: string;
  priority?: Priority;
  status: ObservationStatus;
}

export interface ReportPhotoAppendixItem {
  reference: string;
  observationNumber: string;
  observationTitle: string;
  caption: string;
  mediaId: string;
  location?: string;
  discipline?: Discipline;
  status?: ObservationStatus;
}

export interface ReportDisciplineGroup {
  discipline: Discipline;
  disciplineLabel: string;
  items: ReportObservationEntry[];
}

export interface SiteObservationReport {
  templateType: ReportTemplateType;
  cover: ReportCoverMetadata;
  /** Official template boilerplate shown on the cover page. */
  officialDisclaimer: string;
  tableOfContents: { number: string; title: string }[];
  introduction: string;
  scope: string;
  siteVisitSummary: string;
  /** Progress / general observations — maps to Section A in the official template. */
  progressItems: ReportObservationEntry[];
  /** Deficiency / follow-up observations — maps to Section B in the official template. */
  deficiencyItems: ReportObservationEntry[];
  observationsByDiscipline: ReportDisciplineGroup[];
  actionSummary: ReportActionItem[];
  limitations: string;
  photoAppendix: ReportPhotoAppendixItem[];
}

/** @deprecated Use SiteObservationReport */
export interface ReportDraft {
  title: string;
  generatedAt: string;
  sections: {
    heading: string;
    content: string;
  }[];
}
