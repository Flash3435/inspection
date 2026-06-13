import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  logMedia,
  logMediaError,
  logAudio,
  logAudioError,
  mapUploadErrorToUserMessage,
  MediaUploadError,
  userMessageForStep,
} from "@/lib/media-diagnostics";
import {
  prepareAudioUpload,
  preparePhotoUpload,
} from "@/lib/media-utils";
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
export { MediaUploadError, mapUploadErrorToUserMessage };

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

async function verifyUploadedAudioBlob(
  client: Client,
  saved: CloudMediaItem,
  originalBlob: Blob,
): Promise<void> {
  try {
    const downloaded = await downloadMediaBlob(client, saved.storagePath);
    const sizeMatch = originalBlob.size === downloaded.size;
    logAudio("save:verify", {
      mediaId: saved.id,
      originalSize: originalBlob.size,
      downloadedSize: downloaded.size,
      originalMime: saved.mimeType,
      downloadedType: downloaded.type || "(empty)",
      sizeMatch,
    });
    if (!sizeMatch) {
      logAudioError("save:verify_size_mismatch", {
        mediaId: saved.id,
        originalSize: originalBlob.size,
        downloadedSize: downloaded.size,
      });
    }
  } catch (err) {
    logAudioError("save:verify_failed", {
      mediaId: saved.id,
      storagePath: saved.storagePath,
    }, err);
  }
}

export async function saveMediaItem(
  input: MediaSaveInput,
  options: { userId?: string | null; client?: Client | null; id?: string },
): Promise<{ id: string }> {
  const { userId, client, id } = options;
  const cloud = getCloudContext(userId, client);

  logMedia("save:start", {
    mediaType: input.type,
    hasSession: Boolean(userId && client),
    userId: userId ?? null,
    filename: input.filename,
    mimeType: input.file.type || "(empty)",
    size: input.file.size,
    observationId: input.observationId,
    projectId: input.projectId,
  });

  if (input.type === "audio") {
    logAudio("save:start", {
      filename: input.filename,
      blobMimeType: input.file.type || "(empty)",
      size: input.file.size,
      observationId: input.observationId,
    });
  }

  let prepared;
  try {
    prepared =
      input.type === "photo"
        ? preparePhotoUpload(input.file, input.filename)
        : prepareAudioUpload(input.file, input.filename);
  } catch (err) {
    logMediaError("save:prepare_failed", { mediaType: input.type }, err);
    if (err instanceof MediaUploadError) throw err;
    throw new MediaUploadError(
      "validate",
      input.type,
      mapUploadErrorToUserMessage(err, input.type),
      err,
    );
  }

  logMedia("save:prepared", {
    mediaType: input.type,
    filename: prepared.filename,
    mimeType: prepared.mimeType,
    size: prepared.size,
  });

  if (input.type === "audio") {
    logAudio("save:prepared", {
      filename: prepared.filename,
      mimeType: prepared.mimeType,
      size: prepared.size,
    });
  }

  const normalizedInput: MediaSaveInput = {
    ...input,
    file: prepared.blob,
    filename: prepared.filename,
    mimeType: prepared.mimeType,
  };

  if (cloud) {
    try {
      const saved = await uploadMediaItem(
        cloud.client,
        cloud.userId,
        normalizedInput,
        id,
      );
      logMedia("save:complete", {
        mediaType: input.type,
        mediaId: saved.id,
        storagePath: saved.storagePath,
      });

      if (input.type === "audio") {
        logAudio("save:uploaded", {
          mediaId: saved.id,
          filename: saved.filename,
          mimeType: saved.mimeType,
          originalSize: prepared.size,
          uploadedSize: saved.size,
          storagePath: saved.storagePath,
        });
        await verifyUploadedAudioBlob(
          cloud.client,
          saved,
          prepared.blob,
        );
      }

      return { id: saved.id };
    } catch (err) {
      logMediaError("save:cloud_failed", { mediaType: input.type }, err);
      if (err instanceof MediaUploadError) throw err;
      throw new MediaUploadError(
        "upload",
        input.type,
        mapUploadErrorToUserMessage(err, input.type),
        err,
      );
    }
  }

  if (!userId) {
    logMedia("save:local_fallback", { mediaType: input.type });
  } else {
    logMediaError("save:no_client", {
      mediaType: input.type,
      userId,
    });
    throw new MediaUploadError(
      "auth",
      input.type,
      userMessageForStep("auth", input.type),
    );
  }

  const saved = await saveLocalMediaItem(normalizedInput, id);
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
  try {
    const url = await getSignedMediaUrl(client, item.storagePath);
    if (item.type === "audio") {
      logAudio("resolve:signed_url", {
        mediaId: item.id,
        filename: item.filename,
        mimeType: item.mimeType,
        storagePath: item.storagePath,
        urlPrefix: url.slice(0, 48),
      });
    }
    return {
      id: item.id,
      type: item.type,
      filename: item.filename,
      mimeType: item.mimeType,
      size: item.size,
      createdAt: item.createdAt,
      url,
    };
  } catch (err) {
    if (item.type === "audio") {
      logAudioError("resolve:signed_url_failed", {
        mediaId: item.id,
        storagePath: item.storagePath,
      }, err);
    }
    logMediaError("resolve:signed_url_failed", {
      mediaId: item.id,
      storagePath: item.storagePath,
    }, err);
    throw err;
  }
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

  logMedia("resolve:start", {
    count: ids.length,
    hasSession: Boolean(cloud),
  });

  if (cloud) {
    const items = await getCloudMediaItemsByIds(cloud.client, ids);
    const byId = new Map(items.map((item) => [item.id, item]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((item): item is CloudMediaItem => item !== undefined);

    logMedia("resolve:loaded", {
      requested: ids.length,
      found: ordered.length,
    });

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

export async function verifyAudioBelongsToObservation(
  audioId: string,
  observationId: string,
  options: { userId?: string | null; client?: Client | null },
): Promise<boolean> {
  const { userId, client } = options;
  const cloud = getCloudContext(userId, client);

  if (cloud) {
    const item = await getCloudMediaItem(cloud.client, audioId);
    return item?.type === "audio" && item.observationId === observationId;
  }

  const item = await getLocalMediaItem(audioId);
  return item?.type === "audio";
}

export async function getAudioMediaForTranscription(
  mediaId: string,
  options: { userId?: string | null; client?: Client | null },
): Promise<{ blob: Blob; filename: string; mimeType: string; createdAt: string } | null> {
  const { userId, client } = options;
  const cloud = getCloudContext(userId, client);

  logAudio("transcribe:fetch_start", {
    mediaId,
    hasSession: Boolean(cloud),
  });

  if (cloud) {
    const item = await getCloudMediaItem(cloud.client, mediaId);
    if (!item || item.type !== "audio") {
      logAudio("transcribe:fetch_missing", { mediaId });
      return null;
    }
    const blob = await downloadMediaBlob(cloud.client, item.storagePath);
    logAudio("transcribe:fetch_success", {
      mediaId,
      filename: item.filename,
      mimeType: item.mimeType,
      size: blob.size,
      blobType: blob.type || "(empty)",
    });
    return {
      blob,
      filename: item.filename,
      mimeType: item.mimeType,
      createdAt: item.createdAt,
    };
  }

  const item = await getLocalMediaItem(mediaId);
  if (!item || item.type !== "audio") {
    logAudio("transcribe:fetch_missing", { mediaId });
    return null;
  }
  logAudio("transcribe:fetch_success", {
    mediaId,
    filename: item.filename,
    mimeType: item.mimeType,
    size: item.blob.size,
    blobType: item.blob.type || "(empty)",
    source: "local",
  });
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
