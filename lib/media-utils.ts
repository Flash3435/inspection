import type { MediaType } from "@/lib/types";
import { MediaUploadError } from "@/lib/media-diagnostics";

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

const PHOTO_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/webp": "webp",
};

const AUDIO_MIME_TO_EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/webm;codecs=opus": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/ogg;codecs=opus": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/aac": "aac",
};

function normalizeMimeType(raw: string | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

function baseMimeType(mimeType: string): string {
  return mimeType.split(";")[0]?.trim() ?? mimeType;
}

function extensionFromFilename(filename: string): string | null {
  const match = filename.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function timestampSlug(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export function extensionForPhotoMime(mimeType: string): string {
  const base = baseMimeType(mimeType);
  return PHOTO_MIME_TO_EXT[base] ?? PHOTO_MIME_TO_EXT[mimeType] ?? "jpg";
}

export function extensionForAudioMime(mimeType: string): string {
  const base = baseMimeType(mimeType);
  return AUDIO_MIME_TO_EXT[base] ?? AUDIO_MIME_TO_EXT[mimeType] ?? "webm";
}

export function resolvePhotoMimeType(
  file: Blob,
  filename?: string,
): string {
  const raw = normalizeMimeType(file.type);
  if (raw && raw !== "application/octet-stream") {
    return baseMimeType(raw);
  }

  const ext = filename ? extensionFromFilename(filename) : null;
  if (ext === "png") return "image/png";
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export function resolveAudioMimeType(
  file: Blob,
  filename?: string,
): string {
  const raw = normalizeMimeType(file.type);
  if (raw && raw !== "application/octet-stream") {
    return raw.includes(";") ? raw : baseMimeType(raw);
  }

  const ext = filename ? extensionFromFilename(filename) : null;
  if (ext === "m4a" || ext === "mp4") return "audio/mp4";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "ogg") return "audio/ogg";
  if (ext === "wav") return "audio/wav";
  if (ext === "aac") return "audio/aac";
  return "audio/webm";
}

export function generatePhotoFilename(mimeType: string): string {
  return `photo-${timestampSlug()}.${extensionForPhotoMime(mimeType)}`;
}

export function generateAudioFilename(mimeType: string): string {
  return `recording-${timestampSlug()}.${extensionForAudioMime(mimeType)}`;
}

export function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) return "";
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export interface PreparedMediaFile {
  blob: Blob;
  filename: string;
  mimeType: string;
  size: number;
}

function assertNonEmpty(file: Blob, mediaType: MediaType): void {
  if (file.size <= 0) {
    throw new MediaUploadError(
      "validate",
      mediaType,
      "Unsupported or empty file type.",
    );
  }
}

function assertMaxSize(
  size: number,
  maxBytes: number,
  mediaType: MediaType,
): void {
  if (size > maxBytes) {
    throw new MediaUploadError(
      "validate",
      mediaType,
      `File too large. Maximum size is ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    );
  }
}

export function preparePhotoUpload(
  file: Blob,
  originalFilename?: string,
): PreparedMediaFile {
  assertNonEmpty(file, "photo");
  assertMaxSize(file.size, MAX_PHOTO_BYTES, "photo");

  const mimeType = resolvePhotoMimeType(file, originalFilename);
  const safeOriginal = sanitizeFilename(originalFilename ?? "");
  const hasValidExt =
    safeOriginal.length > 0 && Boolean(extensionFromFilename(safeOriginal));
  const filename = hasValidExt
    ? safeOriginal
    : generatePhotoFilename(mimeType);

  const blob =
    file.type === mimeType
      ? file
      : new Blob([file], { type: mimeType });

  return {
    blob,
    filename,
    mimeType,
    size: blob.size,
  };
}

export function prepareAudioUpload(
  file: Blob,
  originalFilename?: string,
): PreparedMediaFile {
  assertNonEmpty(file, "audio");
  assertMaxSize(file.size, MAX_AUDIO_BYTES, "audio");

  const mimeType = resolveAudioMimeType(file, originalFilename);
  const safeOriginal = sanitizeFilename(originalFilename ?? "");
  const hasValidExt =
    safeOriginal.length > 0 && Boolean(extensionFromFilename(safeOriginal));
  const filename = hasValidExt
    ? safeOriginal
    : generateAudioFilename(mimeType);

  const blob =
    file.type === mimeType
      ? file
      : new Blob([file], { type: mimeType });

  return {
    blob,
    filename,
    mimeType,
    size: blob.size,
  };
}

export const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mpeg",
] as const;

export function getSupportedRecorderMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return (
    RECORDER_MIME_CANDIDATES.find((type) =>
      MediaRecorder.isTypeSupported(type),
    ) ?? null
  );
}

export function normalizeRecorderBlob(
  blob: Blob,
  mimeType: string | null,
): PreparedMediaFile {
  const resolvedMime = mimeType
    ? resolveAudioMimeType(blob, generateAudioFilename(mimeType))
    : resolveAudioMimeType(blob);
  const filename = generateAudioFilename(resolvedMime);
  const normalizedBlob =
    blob.type === resolvedMime
      ? blob
      : new Blob([blob], { type: resolvedMime });

  return prepareAudioUpload(normalizedBlob, filename);
}
