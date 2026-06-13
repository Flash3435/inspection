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
  if (!base || base === "application/octet-stream") return "audio";
  return AUDIO_MIME_TO_EXT[base] ?? AUDIO_MIME_TO_EXT[mimeType] ?? "audio";
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
  if (ext === "webm") return "audio/webm";
  return "application/octet-stream";
}

export function resolveRecordedMime(
  blob: Blob,
  recorderMime: string | null,
  filename?: string,
): string {
  const raw = normalizeMimeType(blob.type);
  if (raw && raw !== "application/octet-stream") {
    return raw.includes(";") ? raw : baseMimeType(raw);
  }
  if (recorderMime) return baseMimeType(recorderMime);
  return resolveAudioMimeType(blob, filename);
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
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

/** MIME types allowed for recording on iPhone/iPad — WebM is excluded. */
export const IOS_RECORDER_MIME_CANDIDATES = [
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
] as const;

export interface BrowserAudioContext {
  userAgent: string;
  isIos: boolean;
  isSafari: boolean;
  isAppleMobileWebKit: boolean;
}

export function isWebmOrOggMime(mimeType: string): boolean {
  const base = baseMimeType(mimeType);
  return base === "audio/webm" || base === "audio/ogg";
}

export function detectBrowserAudioContext(): BrowserAudioContext {
  if (typeof navigator === "undefined") {
    return {
      userAgent: "",
      isIos: false,
      isSafari: false,
      isAppleMobileWebKit: false,
    };
  }
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari =
    /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua);
  return {
    userAgent: ua,
    isIos,
    isSafari,
    isAppleMobileWebKit: isIos,
  };
}

export function isAppleMobileWebKit(): boolean {
  return detectBrowserAudioContext().isAppleMobileWebKit;
}

export function formatAudioFormatLabel(mimeType: string, filename: string): string {
  const base = baseMimeType(mimeType);
  const ext = extensionFromFilename(filename);
  if (base === "audio/webm" || ext === "webm") return "WebM/Opus";
  if (base === "audio/mp4" || ext === "m4a" || ext === "mp4") return "M4A/MP4";
  if (base === "audio/mpeg" || ext === "mp3") return "MP3";
  if (base === "audio/aac" || ext === "aac") return "AAC";
  if (base === "audio/ogg" || ext === "ogg") return "OGG";
  if (base === "audio/wav" || ext === "wav") return "WAV";
  if (mimeType) return mimeType;
  return "Unknown";
}

export function canPlayAudioMime(mimeType: string): boolean {
  if (typeof document === "undefined") return true;
  const base = baseMimeType(mimeType);
  if (!base) return true;
  const audio = document.createElement("audio");
  const result = audio.canPlayType(mimeType) || audio.canPlayType(base);
  return result === "probably" || result === "maybe";
}

export function isLikelyUnsupportedPlayback(
  mimeType: string,
  filename: string,
): boolean {
  const base = baseMimeType(mimeType);
  const ext = extensionFromFilename(filename);
  const candidates = [
    mimeType,
    base,
    ext === "webm" ? "audio/webm" : null,
    ext === "m4a" || ext === "mp4" ? "audio/mp4" : null,
    ext === "mp3" ? "audio/mpeg" : null,
    ext === "ogg" ? "audio/ogg" : null,
    ext === "aac" ? "audio/aac" : null,
  ].filter((value): value is string => Boolean(value));

  return candidates.every((candidate) => !canPlayAudioMime(candidate));
}

export function getRecorderMimeSupport(): Record<string, boolean> {
  if (typeof MediaRecorder === "undefined") {
    return Object.fromEntries(
      RECORDER_MIME_CANDIDATES.map((type) => [type, false]),
    );
  }
  return Object.fromEntries(
    RECORDER_MIME_CANDIDATES.map((type) => [
      type,
      MediaRecorder.isTypeSupported(type),
    ]),
  );
}

function recorderMimeCandidates(): readonly string[] {
  const { isAppleMobileWebKit } = detectBrowserAudioContext();
  return isAppleMobileWebKit ? IOS_RECORDER_MIME_CANDIDATES : RECORDER_MIME_CANDIDATES;
}

export function getSupportedRecorderMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = recorderMimeCandidates();
  return (
    candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
  );
}

export function isRecorderSupportedOnPlatform(): boolean {
  return getSupportedRecorderMimeType() !== null;
}

export const IOS_RECORDER_UNSUPPORTED_MESSAGE =
  "Audio recording is not supported reliably in this browser. Please upload an audio file instead.";

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
