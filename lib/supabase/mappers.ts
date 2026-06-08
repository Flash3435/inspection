import type {
  AudioTranscript,
  Discipline,
  Observation,
  ObservationStatus,
  Priority,
  Project,
  ReportTemplateType,
} from "@/lib/types";
import type {
  Database,
  Json,
  MediaIdsByObservation,
  MediaItemRow,
  ObservationRow,
  ProjectRow,
} from "./database.types";

export type { Database, Json, MediaIdsByObservation, MediaItemRow, ObservationRow, ProjectRow };

function dateToIsoDate(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function isoDateToDb(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  return value.slice(0, 10);
}

export function projectRowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    siteName: row.site_name,
    clientName: row.client_name,
    inspectorName: row.inspector_name,
    inspectionDate: dateToIsoDate(row.inspection_date),
    description: row.description,
    reportTemplate: row.report_template as ReportTemplateType,
    projectNumber: row.project_number ?? undefined,
    reportNumber: row.report_number ?? undefined,
    siteAddress: row.site_address ?? undefined,
    buildingPermitNo: row.building_permit_no ?? undefined,
    contractorName: row.contractor_name ?? undefined,
    preparedBy: row.prepared_by ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    visitDate: dateToIsoDate(row.visit_date) || undefined,
    reportDate: dateToIsoDate(row.report_date) || undefined,
    reasonForVisit: row.reason_for_visit ?? undefined,
    weatherConditions: row.weather_conditions ?? undefined,
    contractorPresent: row.contractor_present ?? undefined,
    distributionList: row.distribution_list ?? undefined,
    isSampleProject: row.is_sample_project,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function projectToInsertRow(
  project: Project,
  userId: string,
): Database["public"]["Tables"]["projects"]["Insert"] {
  return {
    id: project.id,
    user_id: userId,
    name: project.name,
    description: project.description,
    report_template: project.reportTemplate,
    site_name: project.siteName,
    client_name: project.clientName,
    inspector_name: project.inspectorName,
    inspection_date: isoDateToDb(project.inspectionDate),
    project_number: project.projectNumber ?? null,
    report_number: project.reportNumber ?? null,
    site_address: project.siteAddress ?? null,
    building_permit_no: project.buildingPermitNo ?? null,
    contractor_name: project.contractorName ?? null,
    prepared_by: project.preparedBy ?? null,
    reviewed_by: project.reviewedBy ?? null,
    visit_date: isoDateToDb(project.visitDate),
    report_date: isoDateToDb(project.reportDate),
    reason_for_visit: project.reasonForVisit ?? null,
    weather_conditions: project.weatherConditions ?? null,
    contractor_present: project.contractorPresent ?? null,
    distribution_list: project.distributionList ?? null,
    is_sample_project: project.isSampleProject ?? false,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

export function projectInputToUpdateRow(
  input: Partial<Project>,
): Database["public"]["Tables"]["projects"]["Update"] {
  const row: Database["public"]["Tables"]["projects"]["Update"] = {};

  if (input.name !== undefined) row.name = input.name;
  if (input.description !== undefined) row.description = input.description;
  if (input.reportTemplate !== undefined) row.report_template = input.reportTemplate;
  if (input.siteName !== undefined) row.site_name = input.siteName;
  if (input.clientName !== undefined) row.client_name = input.clientName;
  if (input.inspectorName !== undefined) row.inspector_name = input.inspectorName;
  if (input.inspectionDate !== undefined) {
    row.inspection_date = isoDateToDb(input.inspectionDate);
  }
  if (input.projectNumber !== undefined) row.project_number = input.projectNumber || null;
  if (input.reportNumber !== undefined) row.report_number = input.reportNumber || null;
  if (input.siteAddress !== undefined) row.site_address = input.siteAddress || null;
  if (input.buildingPermitNo !== undefined) {
    row.building_permit_no = input.buildingPermitNo || null;
  }
  if (input.contractorName !== undefined) row.contractor_name = input.contractorName || null;
  if (input.preparedBy !== undefined) row.prepared_by = input.preparedBy || null;
  if (input.reviewedBy !== undefined) row.reviewed_by = input.reviewedBy || null;
  if (input.visitDate !== undefined) row.visit_date = isoDateToDb(input.visitDate);
  if (input.reportDate !== undefined) row.report_date = isoDateToDb(input.reportDate);
  if (input.reasonForVisit !== undefined) {
    row.reason_for_visit = input.reasonForVisit || null;
  }
  if (input.weatherConditions !== undefined) {
    row.weather_conditions = input.weatherConditions || null;
  }
  if (input.contractorPresent !== undefined) {
    row.contractor_present = input.contractorPresent || null;
  }
  if (input.distributionList !== undefined) {
    row.distribution_list = input.distributionList || null;
  }
  if (input.isSampleProject !== undefined) row.is_sample_project = input.isSampleProject;

  return row;
}

export function observationRowToObservation(
  row: ObservationRow,
  mediaIds: MediaIdsByObservation = { photoIds: [], audioIds: [] },
): Observation {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    location: row.location,
    note: row.note,
    photoIds: mediaIds.photoIds,
    audioIds: mediaIds.audioIds,
    transcripts: (row.transcripts ?? {}) as unknown as Record<string, AudioTranscript>,
    draftText: row.draft_text,
    draftWarnings: (row.draft_warnings as string[] | null) ?? undefined,
    draftGeneratedAt: row.draft_generated_at ?? undefined,
    draftSourceSummary: row.draft_source_summary ?? undefined,
    draftManuallyEdited: row.draft_manually_edited,
    status: row.status as ObservationStatus,
    discipline: row.discipline as Discipline,
    observationNumber: row.observation_number ?? undefined,
    contractorActionRequired: row.contractor_action_required,
    priority: (row.priority as Priority | null) ?? undefined,
    recommendedAction: row.recommended_action ?? undefined,
    codeReferenceIds: (row.code_reference_ids as string[]) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function observationToInsertRow(
  observation: Observation,
  userId: string,
): Database["public"]["Tables"]["observations"]["Insert"] {
  return {
    id: observation.id,
    project_id: observation.projectId,
    user_id: userId,
    title: observation.title,
    location: observation.location,
    status: observation.status,
    discipline: observation.discipline,
    priority: observation.priority ?? null,
    contractor_action_required: observation.contractorActionRequired,
    note: observation.note,
    draft_text: observation.draftText,
    recommended_action: observation.recommendedAction ?? null,
    transcripts: observation.transcripts as unknown as Json,
    draft_warnings: (observation.draftWarnings ?? []) as unknown as Json,
    draft_generated_at: observation.draftGeneratedAt ?? null,
    draft_source_summary: observation.draftSourceSummary ?? null,
    draft_manually_edited: observation.draftManuallyEdited ?? false,
    observation_number: observation.observationNumber ?? null,
    code_reference_ids: observation.codeReferenceIds as unknown as Json,
    created_at: observation.createdAt,
    updated_at: observation.updatedAt,
  };
}

export function observationInputToUpdateRow(
  input: Partial<Observation>,
): Database["public"]["Tables"]["observations"]["Update"] {
  const row: Database["public"]["Tables"]["observations"]["Update"] = {};

  if (input.title !== undefined) row.title = input.title;
  if (input.location !== undefined) row.location = input.location;
  if (input.status !== undefined) row.status = input.status;
  if (input.discipline !== undefined) row.discipline = input.discipline;
  if (input.priority !== undefined) row.priority = input.priority ?? null;
  if (input.contractorActionRequired !== undefined) {
    row.contractor_action_required = input.contractorActionRequired;
  }
  if (input.note !== undefined) row.note = input.note;
  if (input.draftText !== undefined) row.draft_text = input.draftText;
  if (input.recommendedAction !== undefined) {
    row.recommended_action = input.recommendedAction || null;
  }
  if (input.transcripts !== undefined) {
    row.transcripts = input.transcripts as unknown as Json;
  }
  if (input.draftWarnings !== undefined) {
    row.draft_warnings = input.draftWarnings as unknown as Json;
  }
  if (input.draftGeneratedAt !== undefined) {
    row.draft_generated_at = input.draftGeneratedAt || null;
  }
  if (input.draftSourceSummary !== undefined) {
    row.draft_source_summary = input.draftSourceSummary || null;
  }
  if (input.draftManuallyEdited !== undefined) {
    row.draft_manually_edited = input.draftManuallyEdited;
  }
  if (input.observationNumber !== undefined) {
    row.observation_number = input.observationNumber || null;
  }
  if (input.codeReferenceIds !== undefined) {
    row.code_reference_ids = input.codeReferenceIds as unknown as Json;
  }

  return row;
}

export function groupMediaIdsByObservation(
  rows: MediaItemRow[],
): Map<string, MediaIdsByObservation> {
  const map = new Map<string, MediaIdsByObservation>();

  for (const row of rows) {
    const existing = map.get(row.observation_id) ?? {
      photoIds: [],
      audioIds: [],
    };

    if (row.type === "photo") {
      existing.photoIds.push(row.id);
    } else {
      existing.audioIds.push(row.id);
    }

    map.set(row.observation_id, existing);
  }

  return map;
}
