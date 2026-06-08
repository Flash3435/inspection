import type { InspectionStore, Observation, Project } from "./types";

interface LegacyPhotoAttachment {
  id: string;
  name?: string;
  url?: string;
}

interface LegacyAudioAttachment {
  id: string;
  name?: string;
  url?: string;
}

type RawObservation = Partial<Observation> & {
  photos?: LegacyPhotoAttachment[];
  audio?: LegacyAudioAttachment[];
};

type RawProject = Partial<Project>;

function normalizeObservation(raw: RawObservation): Observation {
  const photoIds =
    raw.photoIds ??
    (Array.isArray(raw.photos) ? raw.photos.map((p) => p.id) : []);
  const audioIds =
    raw.audioIds ??
    (Array.isArray(raw.audio) ? raw.audio.map((a) => a.id) : []);

  return {
    id: raw.id!,
    projectId: raw.projectId!,
    title: raw.title ?? "",
    location: raw.location ?? "",
    note: raw.note ?? "",
    photoIds,
    audioIds,
    transcripts: raw.transcripts ?? {},
    draftText: raw.draftText ?? "",
    draftWarnings: raw.draftWarnings,
    draftGeneratedAt: raw.draftGeneratedAt,
    draftSourceSummary: raw.draftSourceSummary,
    draftManuallyEdited: raw.draftManuallyEdited ?? false,
    status: raw.status ?? "general",
    discipline: raw.discipline ?? "general",
    observationNumber: raw.observationNumber,
    contractorActionRequired: raw.contractorActionRequired ?? false,
    priority: raw.priority,
    recommendedAction: raw.recommendedAction,
    codeReferenceIds: raw.codeReferenceIds ?? [],
    createdAt: raw.createdAt!,
    updatedAt: raw.updatedAt!,
  };
}

function normalizeProject(raw: RawProject): Project {
  return {
    id: raw.id!,
    name: raw.name ?? "",
    siteName: raw.siteName ?? "",
    clientName: raw.clientName ?? "",
    inspectorName: raw.inspectorName ?? "",
    inspectionDate: raw.inspectionDate ?? "",
    description: raw.description ?? "",
    reportTemplate: raw.reportTemplate ?? "site_observation_report",
    projectNumber: raw.projectNumber,
    reportNumber: raw.reportNumber,
    siteAddress: raw.siteAddress,
    buildingPermitNo: raw.buildingPermitNo,
    contractorName: raw.contractorName,
    preparedBy: raw.preparedBy ?? raw.inspectorName,
    reviewedBy: raw.reviewedBy,
    visitDate: raw.visitDate ?? raw.inspectionDate,
    reportDate: raw.reportDate,
    reasonForVisit: raw.reasonForVisit,
    weatherConditions: raw.weatherConditions,
    contractorPresent: raw.contractorPresent,
    distributionList: raw.distributionList,
    isSampleProject: raw.isSampleProject ?? false,
    createdAt: raw.createdAt!,
    updatedAt: raw.updatedAt!,
  };
}

export function migrateStore(store: InspectionStore): InspectionStore {
  return {
    projects: store.projects.map((project) =>
      normalizeProject(project as RawProject),
    ),
    observations: store.observations.map((obs) =>
      normalizeObservation(obs as RawObservation),
    ),
  };
}
