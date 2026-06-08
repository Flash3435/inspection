import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { MediaType } from "@/lib/types";

const BUCKET = "inspection-media";
const SIGNED_URL_TTL_SECONDS = 3600;

type Client = SupabaseClient<Database>;

export interface CloudMediaItem {
  id: string;
  observationId: string;
  projectId: string;
  type: MediaType;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  storagePath: string;
}

export interface MediaSaveInput {
  observationId: string;
  projectId: string;
  type: MediaType;
  file: Blob;
  filename: string;
}

function buildStoragePath(
  userId: string,
  projectId: string,
  observationId: string,
  mediaId: string,
  filename: string,
): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${projectId}/${observationId}/${mediaId}/${safeName}`;
}

export async function uploadMediaItem(
  client: Client,
  userId: string,
  input: MediaSaveInput,
  id?: string,
): Promise<CloudMediaItem> {
  const mediaId = id ?? crypto.randomUUID();
  const storagePath = buildStoragePath(
    userId,
    input.projectId,
    input.observationId,
    mediaId,
    input.filename,
  );

  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(storagePath, input.file, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await client
    .from("media_items")
    .insert({
      id: mediaId,
      project_id: input.projectId,
      observation_id: input.observationId,
      user_id: userId,
      type: input.type,
      storage_path: storagePath,
      filename: input.filename,
      mime_type: input.file.type || "application/octet-stream",
      size: input.file.size,
    })
    .select("*")
    .single();

  if (error) {
    await client.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }

  return {
    id: data.id,
    observationId: data.observation_id,
    projectId: data.project_id,
    type: data.type as MediaType,
    filename: data.filename,
    mimeType: data.mime_type,
    size: data.size,
    createdAt: data.created_at,
    storagePath: data.storage_path,
  };
}

export async function getMediaItemsByIds(
  client: Client,
  ids: string[],
): Promise<CloudMediaItem[]> {
  if (ids.length === 0) return [];

  const { data, error } = await client
    .from("media_items")
    .select("*")
    .in("id", ids);

  if (error) throw error;

  const byId = new Map((data ?? []).map((row) => [row.id, row]));

  return ids
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => row !== undefined)
    .map((row) => ({
      id: row.id,
      observationId: row.observation_id,
      projectId: row.project_id,
      type: row.type as MediaType,
      filename: row.filename,
      mimeType: row.mime_type,
      size: row.size,
      createdAt: row.created_at,
      storagePath: row.storage_path,
    }));
}

export async function getSignedMediaUrl(
  client: Client,
  storagePath: string,
): Promise<string> {
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw error ?? new Error("Failed to create signed URL");
  }

  return data.signedUrl;
}

export async function downloadMediaBlob(
  client: Client,
  storagePath: string,
): Promise<Blob> {
  const { data, error } = await client.storage
    .from(BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw error ?? new Error("Failed to download media");
  }

  return data;
}

export async function deleteMediaItem(
  client: Client,
  mediaId: string,
): Promise<void> {
  const { data, error: fetchError } = await client
    .from("media_items")
    .select("storage_path")
    .eq("id", mediaId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!data) return;

  const { error: storageError } = await client.storage
    .from(BUCKET)
    .remove([data.storage_path]);

  if (storageError) throw storageError;

  const { error: deleteError } = await client
    .from("media_items")
    .delete()
    .eq("id", mediaId);

  if (deleteError) throw deleteError;
}

export async function deleteMediaItems(
  client: Client,
  ids: string[],
): Promise<void> {
  await Promise.all(ids.map((id) => deleteMediaItem(client, id)));
}

export async function deleteMediaForObservation(
  client: Client,
  observationId: string,
): Promise<void> {
  const { data, error } = await client
    .from("media_items")
    .select("id, storage_path")
    .eq("observation_id", observationId);

  if (error) throw error;
  if (!data?.length) return;

  const paths = data.map((row) => row.storage_path);
  const { error: storageError } = await client.storage
    .from(BUCKET)
    .remove(paths);

  if (storageError) throw storageError;

  const { error: deleteError } = await client
    .from("media_items")
    .delete()
    .eq("observation_id", observationId);

  if (deleteError) throw deleteError;
}

export async function deleteMediaForProject(
  client: Client,
  projectId: string,
): Promise<void> {
  const { data, error } = await client
    .from("media_items")
    .select("id, storage_path")
    .eq("project_id", projectId);

  if (error) throw error;
  if (!data?.length) return;

  const paths = data.map((row) => row.storage_path);
  const { error: storageError } = await client.storage
    .from(BUCKET)
    .remove(paths);

  if (storageError) throw storageError;

  const { error: deleteError } = await client
    .from("media_items")
    .delete()
    .eq("project_id", projectId);

  if (deleteError) throw deleteError;
}

export async function getMediaItem(
  client: Client,
  mediaId: string,
): Promise<CloudMediaItem | null> {
  const items = await getMediaItemsByIds(client, [mediaId]);
  return items[0] ?? null;
}
