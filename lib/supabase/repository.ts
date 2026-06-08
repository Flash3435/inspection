import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import {
  groupMediaIdsByObservation,
  observationRowToObservation,
  observationToInsertRow,
  observationInputToUpdateRow,
  projectRowToProject,
  projectToInsertRow,
  projectInputToUpdateRow,
} from "./mappers";
import type { Observation, ObservationInput, Project, ProjectInput } from "@/lib/types";
import { generateId } from "@/lib/utils";

type Client = SupabaseClient<Database>;

export async function fetchAllProjects(client: Client): Promise<Project[]> {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(projectRowToProject);
}

export async function fetchProjectById(
  client: Client,
  projectId: string,
): Promise<Project | null> {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  return data ? projectRowToProject(data) : null;
}

export async function insertProject(
  client: Client,
  userId: string,
  input: ProjectInput,
  id?: string,
): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    ...input,
    id: id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await client
    .from("projects")
    .insert(projectToInsertRow(project, userId))
    .select("*")
    .single();

  if (error) throw error;
  return projectRowToProject(data);
}

export async function updateProjectInDb(
  client: Client,
  projectId: string,
  input: Partial<ProjectInput>,
): Promise<Project> {
  const { data, error } = await client
    .from("projects")
    .update(projectInputToUpdateRow(input))
    .eq("id", projectId)
    .select("*")
    .single();

  if (error) throw error;
  return projectRowToProject(data);
}

export async function deleteProjectFromDb(
  client: Client,
  projectId: string,
): Promise<void> {
  const { error } = await client.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

export async function fetchObservationsForProject(
  client: Client,
  projectId: string,
): Promise<Observation[]> {
  const [obsResult, mediaResult] = await Promise.all([
    client
      .from("observations")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
    client.from("media_items").select("*").eq("project_id", projectId),
  ]);

  if (obsResult.error) throw obsResult.error;
  if (mediaResult.error) throw mediaResult.error;

  const mediaByObservation = groupMediaIdsByObservation(mediaResult.data ?? []);

  return (obsResult.data ?? []).map((row) =>
    observationRowToObservation(
      row,
      mediaByObservation.get(row.id) ?? { photoIds: [], audioIds: [] },
    ),
  );
}

export async function fetchAllObservations(client: Client): Promise<Observation[]> {
  const [obsResult, mediaResult] = await Promise.all([
    client.from("observations").select("*").order("updated_at", { ascending: false }),
    client.from("media_items").select("*"),
  ]);

  if (obsResult.error) throw obsResult.error;
  if (mediaResult.error) throw mediaResult.error;

  const mediaByObservation = groupMediaIdsByObservation(mediaResult.data ?? []);

  return (obsResult.data ?? []).map((row) =>
    observationRowToObservation(
      row,
      mediaByObservation.get(row.id) ?? { photoIds: [], audioIds: [] },
    ),
  );
}

export async function insertObservation(
  client: Client,
  userId: string,
  projectId: string,
  input: ObservationInput,
  observationId?: string,
): Promise<Observation> {
  const now = new Date().toISOString();
  const observation: Observation = {
    id: observationId ?? generateId(),
    projectId,
    title: input.title,
    location: input.location,
    note: input.note,
    photoIds: input.photoIds,
    audioIds: input.audioIds,
    transcripts: input.transcripts ?? {},
    draftText: input.draftText ?? "",
    draftWarnings: input.draftWarnings,
    draftGeneratedAt: input.draftGeneratedAt,
    draftSourceSummary: input.draftSourceSummary,
    draftManuallyEdited: input.draftManuallyEdited ?? false,
    status: input.status,
    discipline: input.discipline,
    observationNumber: input.observationNumber,
    contractorActionRequired: input.contractorActionRequired,
    priority: input.priority,
    recommendedAction: input.recommendedAction,
    codeReferenceIds: input.codeReferenceIds ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await client
    .from("observations")
    .insert(observationToInsertRow(observation, userId))
    .select("*")
    .single();

  if (error) throw error;

  return observationRowToObservation(data, {
    photoIds: observation.photoIds,
    audioIds: observation.audioIds,
  });
}

export async function updateObservationInDb(
  client: Client,
  observationId: string,
  input: Partial<ObservationInput>,
): Promise<Observation> {
  const { data, error } = await client
    .from("observations")
    .update(observationInputToUpdateRow(input))
    .eq("id", observationId)
    .select("*")
    .single();

  if (error) throw error;

  const [mediaResult] = await Promise.all([
    client.from("media_items").select("*").eq("observation_id", observationId),
  ]);

  if (mediaResult.error) throw mediaResult.error;

  const mediaIds = groupMediaIdsByObservation(mediaResult.data ?? []).get(
    observationId,
  ) ?? { photoIds: [], audioIds: [] };

  return observationRowToObservation(data, {
    photoIds: input.photoIds ?? mediaIds.photoIds,
    audioIds: input.audioIds ?? mediaIds.audioIds,
  });
}

export async function deleteObservationFromDb(
  client: Client,
  observationId: string,
): Promise<void> {
  const { error } = await client
    .from("observations")
    .delete()
    .eq("id", observationId);
  if (error) throw error;
}

export async function updateObservationTranscriptsInDb(
  client: Client,
  observationId: string,
  transcripts: Observation["transcripts"],
): Promise<void> {
  const { error } = await client
    .from("observations")
    .update({ transcripts: transcripts as never })
    .eq("id", observationId);
  if (error) throw error;
}
