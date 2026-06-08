import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  deleteMediaForObservation as deleteCloudMediaForObservation,
  deleteMediaForProject as deleteCloudMediaForProject,
  deleteMediaItem as deleteCloudMediaItem,
  deleteMediaItems as deleteCloudMediaItems,
  downloadMediaBlob,
  getMediaItem as getCloudMediaItem,
  getMediaItemsByIds as getCloudMediaItemsByIds,
  getSignedMediaUrl,
  uploadMediaItem,
  type CloudMediaItem,
  type MediaSaveInput,
} from "@/lib/supabase/media-repository";
import {
  deleteMediaForObservation as deleteLocalMediaForObservation,
  deleteMediaForProject as deleteLocalMediaForProject,
  deleteMediaItem as deleteLocalMediaItem,
  deleteMediaItems as deleteLocalMediaItems,
  getMediaItem as getLocalMediaItem,
  getMediaItemsByIds as getLocalMediaItemsByIds,
  saveMediaItem as saveLocalMediaItem,
  type StoredMediaItem,
} from "@/lib/media-storage";

export type { MediaSaveInput };
export type MediaType = "photo" | "audio";

export interface ResolvedMediaRecord {
  id: string;
  type: MediaType;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
  blob?: Blob;
}

type Client = SupabaseClient<Database>;

function getCloudContext(
  userId: string | null | undefined,
  client: Client | null | undefined,
): { userId: string; client: Client } | null {
  if (userId && client) return { userId, client };
  return null;
}

export async function saveMediaItem(
  input: MediaSaveInput,
  options: { userId?: string | null; client?: Client | null; id?: string },
): Promise<{ id: string }> {
  const { userId, client, id } = options;
  const cloud = getCloudContext(userId, client);

  if (cloud) {
    const saved = await uploadMediaItem(cloud.client, cloud.userId, input, id);
    return { id: saved.id };
  }

  const saved = await saveLocalMediaItem(input, id);
  return { id: saved.id };
}

export async function deleteMediaItem(
  id: string,
  options: { userId?: string | null; client?: Client | null },
): Promise<void> {
  const { userId, client } = options;
  const cloud = getCloudContext(userId, client);

  if (cloud) {
    await deleteCloudMediaItem(cloud.client, id);
    return;
  }

  await deleteLocalMediaItem(id);
}

export async function deleteMediaItems(
  ids: string[],
  options: { userId?: string | null; client?: Client | null },
): Promise<void> {
  const { userId, client } = options;
  const cloud = getCloudContext(userId, client);

  if (cloud) {
    await deleteCloudMediaItems(cloud.client, ids);
    return;
  }

  await deleteLocalMediaItems(ids);
}

export async function deleteMediaForObservation(
  observationId: string,
  options: { userId?: string | null; client?: Client | null },
): Promise<void> {
  const { userId, client } = options;
  const cloud = getCloudContext(userId, client);

  if (cloud) {
    await deleteCloudMediaForObservation(cloud.client, observationId);
    return;
  }

  await deleteLocalMediaForObservation(observationId);
}

export async function deleteMediaForProject(
  projectId: string,
  options: { userId?: string | null; client?: Client | null },
): Promise<void> {
  const { userId, client } = options;
  const cloud = getCloudContext(userId, client);

  if (cloud) {
    await deleteCloudMediaForProject(cloud.client, projectId);
    return;
  }

  await deleteLocalMediaForProject(projectId);
}

async function resolveCloudMedia(
  client: Client,
  item: CloudMediaItem,
): Promise<ResolvedMediaRecord> {
  const url = await getSignedMediaUrl(client, item.storagePath);
  return {
    id: item.id,
    type: item.type,
    filename: item.filename,
    mimeType: item.mimeType,
    size: item.size,
    createdAt: item.createdAt,
    url,
  };
}

function resolveLocalMedia(item: StoredMediaItem): ResolvedMediaRecord {
  return {
    id: item.id,
    type: item.type,
    filename: item.filename,
    mimeType: item.mimeType,
    size: item.size,
    createdAt: item.createdAt,
    url: URL.createObjectURL(item.blob),
    blob: item.blob,
  };
}

export async function resolveMediaByIds(
  ids: string[],
  options: { userId?: string | null; client?: Client | null },
): Promise<ResolvedMediaRecord[]> {
  if (ids.length === 0) return [];

  const { userId, client } = options;
  const cloud = getCloudContext(userId, client);

  if (cloud) {
    const items = await getCloudMediaItemsByIds(cloud.client, ids);
    const byId = new Map(items.map((item) => [item.id, item]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((item): item is CloudMediaItem => item !== undefined);

    return Promise.all(
      ordered.map((item) => resolveCloudMedia(cloud.client, item)),
    );
  }

  const items = await getLocalMediaItemsByIds(ids);
  const byId = new Map(items.map((item) => [item.id, item]));

  return ids
    .map((id) => byId.get(id))
    .filter((item): item is StoredMediaItem => item !== undefined)
    .map(resolveLocalMedia);
}

export async function getMediaBlobForExport(
  mediaId: string,
  options: { userId?: string | null; client?: Client | null },
): Promise<{ blob: Blob; mimeType: string } | null> {
  const { userId, client } = options;
  const cloud = getCloudContext(userId, client);

  if (cloud) {
    const item = await getCloudMediaItem(cloud.client, mediaId);
    if (!item) return null;
    const blob = await downloadMediaBlob(cloud.client, item.storagePath);
    return { blob, mimeType: item.mimeType };
  }

  const item = await getLocalMediaItem(mediaId);
  if (!item || item.type !== "photo") return null;
  return { blob: item.blob, mimeType: item.mimeType };
}

export async function getAudioMediaForTranscription(
  mediaId: string,
  options: { userId?: string | null; client?: Client | null },
): Promise<{ blob: Blob; filename: string; mimeType: string; createdAt: string } | null> {
  const { userId, client } = options;
  const cloud = getCloudContext(userId, client);

  if (cloud) {
    const item = await getCloudMediaItem(cloud.client, mediaId);
    if (!item || item.type !== "audio") return null;
    const blob = await downloadMediaBlob(cloud.client, item.storagePath);
    return {
      blob,
      filename: item.filename,
      mimeType: item.mimeType,
      createdAt: item.createdAt,
    };
  }

  const item = await getLocalMediaItem(mediaId);
  if (!item || item.type !== "audio") return null;
  return {
    blob: item.blob,
    filename: item.filename,
    mimeType: item.mimeType,
    createdAt: item.createdAt,
  };
}

export function hasLocalDemoData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("inspection-app-store");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { projects?: unknown[] };
    return Array.isArray(parsed.projects) && parsed.projects.length > 0;
  } catch {
    return false;
  }
}
