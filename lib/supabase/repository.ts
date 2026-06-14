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
import { logMedia, logTranscribe, logTranscribeError } from "@/lib/media-diagnostics";
import { serializeTranscriptsForDb } from "@/lib/transcript-utils";
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
  logProjectMediaLoadStats(projectId, mediaResult.data ?? [], mediaByObservation);

  return (obsResult.data ?? []).map((row) =>
    observationRowToObservation(
      row,
      mediaByObservation.get(row.id) ?? { photoIds: [], audioIds: [] },
    ),
  );
}

function logProjectMediaLoadStats(
  projectId: string,
  mediaRows: { id: string; observation_id: string; type: string }[],
  mediaByObservation: ReturnType<typeof groupMediaIdsByObservation>,
): void {
  const photoCount = mediaRows.filter((row) => row.type === "photo").length;
  const audioCount = mediaRows.filter((row) => row.type === "audio").length;

  logMedia("load:project_media", {
    projectId,
    totalMediaItems: mediaRows.length,
    photoCount,
    audioCount,
    observationCount: mediaByObservation.size,
    perObservation: Array.from(mediaByObservation.entries()).map(
      ([observationId, ids]) => ({
        observationId,
        photoIds: ids.photoIds.length,
        audioIds: ids.audioIds.length,
      }),
    ),
  });
}

export async function fetchAllObservations(client: Client): Promise<Observation[]> {
  const [obsResult, mediaResult] = await Promise.all([
    client.from("observations").select("*").order("updated_at", { ascending: false }),
    client.from("media_items").select("*"),
  ]);

  if (obsResult.error) throw obsResult.error;
  if (mediaResult.error) throw mediaResult.error;

  const mediaByObservation = groupMediaIdsByObservation(mediaResult.data ?? []);

  const photoCount = (mediaResult.data ?? []).filter((row) => row.type === "photo").length;
  const audioCount = (mediaResult.data ?? []).filter((row) => row.type === "audio").length;

  logMedia("load:all_media", {
    totalMediaItems: mediaResult.data?.length ?? 0,
    photoCount,
    audioCount,
    observationCount: mediaByObservation.size,
  });

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

export async function getObservationById(
  client: Client,
  projectId: string,
  observationId: string,
): Promise<Observation | null> {
  const { data, error } = await client
    .from("observations")
    .select("*")
    .eq("id", observationId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: mediaRows, error: mediaError } = await client
    .from("media_items")
    .select("*")
    .eq("observation_id", observationId);

  if (mediaError) throw mediaError;

  const mediaByObservation = groupMediaIdsByObservation(mediaRows ?? []);
  const mediaIds = mediaByObservation.get(observationId) ?? {
    photoIds: [],
    audioIds: [],
  };

  return observationRowToObservation(data, mediaIds);
}

export async function observationExistsInDb(
  client: Client,
  projectId: string,
  observationId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("observations")
    .select("id")
    .eq("id", observationId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function upsertObservationTranscriptByMediaId(
  client: Client,
  projectId: string,
  audioId: string,
  transcript: Observation["transcripts"][string],
): Promise<{ observationId: string; transcripts: Observation["transcripts"] } | null> {
  const { data: mediaRow, error: mediaError } = await client
    .from("media_items")
    .select("id, observation_id, project_id, type")
    .eq("id", audioId)
    .maybeSingle();

  if (mediaError) throw mediaError;
  if (
    !mediaRow ||
    mediaRow.type !== "audio" ||
    mediaRow.project_id !== projectId
  ) {
    return null;
  }

  const observation = await getObservationById(
    client,
    projectId,
    mediaRow.observation_id,
  );
  if (!observation) return null;

  const transcripts = {
    ...observation.transcripts,
    [audioId]: transcript,
  };

  await updateObservationTranscriptsInDb(client, observation.id, transcripts, {
    projectId,
    audioId,
  });
  return { observationId: observation.id, transcripts };
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
  context?: { userId?: string; projectId?: string; audioId?: string },
): Promise<Observation["transcripts"]> {
  const sanitized = serializeTranscriptsForDb(transcripts);
  const transcriptKeys = Object.keys(sanitized);
  const sampleEntry = transcriptKeys[0]
    ? sanitized[transcriptKeys[0]]
    : undefined;

  logTranscribe("db:update_start", {
    observationId,
    projectId: context?.projectId,
    audioId: context?.audioId,
    userId: context?.userId,
    transcriptCount: transcriptKeys.length,
    transcriptKeys,
    sampleStatus: sampleEntry?.status,
    sampleTextLength: sampleEntry?.text?.length ?? 0,
  });

  const { data, error } = await client
    .from("observations")
    .update({ transcripts: sanitized as never })
    .eq("id", observationId)
    .select("id, transcripts, user_id, project_id")
    .maybeSingle();

  if (error) {
    logTranscribeError(
      "db:update_failed",
      {
        observationId,
        projectId: context?.projectId,
        audioId: context?.audioId,
        userId: context?.userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
      error,
    );
    throw error;
  }

  if (!data) {
    logTranscribeError("db:update_no_row", {
      observationId,
      projectId: context?.projectId,
      audioId: context?.audioId,
      userId: context?.userId,
      hint: "RLS may have blocked update or observation id mismatch",
    });
    throw new Error("Observation transcript update matched no rows.");
  }

  logTranscribe("db:update_success", {
    observationId,
    projectId: data.project_id,
    rowUserId: data.user_id,
    transcriptCount: transcriptKeys.length,
  });

  return (data.transcripts ?? sanitized) as unknown as Observation["transcripts"];
}
