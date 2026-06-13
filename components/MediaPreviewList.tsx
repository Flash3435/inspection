"use client";

import type { ResolvedMediaItem } from "@/hooks/useResolvedMedia";
import type { AudioTranscript } from "@/lib/types";
import { getTranscriptForAudio } from "@/lib/transcript-utils";
import { AudioNoteItem } from "./AudioNoteItem";

export interface LocalAudioPlaybackEntry {
  url: string;
  mimeType: string;
  filename: string;
  size?: number;
  createdAt?: string;
}

interface MediaPreviewListProps {
  photos: ResolvedMediaItem[];
  audio: ResolvedMediaItem[];
  loading?: boolean;
  resolveError?: string | null;
  transcripts?: Record<string, AudioTranscript>;
  compact?: boolean;
  localAudioPlayback?: Record<string, LocalAudioPlaybackEntry>;
  savedAudioIds?: ReadonlySet<string>;
  onRemovePhoto?: (id: string) => void;
  onRemoveAudio?: (id: string) => void;
  onTranscribe?: (audioId: string) => void | Promise<void>;
  onUpdateTranscript?: (audioId: string, text: string) => void;
  onClearTranscript?: (audioId: string) => void;
  onRetryResolve?: () => void;
}

export function MediaPreviewList({
  photos,
  audio,
  loading,
  resolveError,
  transcripts = {},
  compact = false,
  localAudioPlayback = {},
  savedAudioIds,
  onRemovePhoto,
  onRemoveAudio,
  onTranscribe,
  onUpdateTranscript,
  onClearTranscript,
  onRetryResolve,
}: MediaPreviewListProps) {
  const hasLocalAudio = Object.keys(localAudioPlayback).length > 0;
  const audioIdsFromList = new Set(audio.map((item) => item.id));
  const pendingLocalAudio: ResolvedMediaItem[] = Object.entries(localAudioPlayback)
    .filter(([id]) => !audioIdsFromList.has(id))
    .map(([id, local]) => ({
      id,
      type: "audio" as const,
      filename: local.filename,
      mimeType: local.mimeType,
      size: local.size ?? 0,
      createdAt: local.createdAt ?? new Date().toISOString(),
      url: local.url,
    }));
  const allAudio = [...audio, ...pendingLocalAudio];
  const showPhotoSkeleton = loading && photos.length === 0;
  const showAudioSkeleton =
    loading && allAudio.length === 0 && !hasLocalAudio;

  if (showPhotoSkeleton && showAudioSkeleton) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-16 w-16 rounded-lg bg-slate-200" />
        <div className="h-4 w-32 rounded bg-slate-200" />
      </div>
    );
  }

  if (photos.length === 0 && allAudio.length === 0 && !hasLocalAudio) {
    return null;
  }

  return (
    <div className="space-y-4">
      {resolveError && (
        <p className="text-xs text-amber-700" role="status">
          Audio saved, but preview is still loading. Try refreshing.
          {onRetryResolve && (
            <button
              type="button"
              onClick={onRetryResolve}
              className="ml-2 font-medium text-slate-700 underline hover:text-slate-900"
            >
              Retry
            </button>
          )}
        </p>
      )}

      {photos.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">
            {photos.length} photo{photos.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative">
                <div className="h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.filename}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p
                  className="mt-1 max-w-20 truncate text-[10px] text-slate-500"
                  title={photo.filename}
                >
                  {photo.filename}
                </p>
                {onRemovePhoto && (
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(photo.id)}
                    className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(allAudio.length > 0 || hasLocalAudio) && (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">
            {allAudio.length} audio note{allAudio.length !== 1 ? "s" : ""}
          </p>
          {showAudioSkeleton && (
            <div className="mb-2 animate-pulse rounded-lg border border-slate-200 bg-slate-100 p-3">
              <div className="h-3 w-40 rounded bg-slate-200" />
              <div className="mt-2 h-8 w-full rounded bg-slate-200" />
            </div>
          )}
          <ul className="space-y-2">
            {allAudio.map((item) => {
              const local = localAudioPlayback[item.id];
              const useLocalPlayback = Boolean(local?.url);
              const playbackItem: ResolvedMediaItem = local
                ? {
                    ...item,
                    url: local.url,
                    mimeType: local.mimeType,
                    filename: local.filename,
                    size: local.size ?? item.size,
                    createdAt: local.createdAt ?? item.createdAt,
                  }
                : item;
              const transcript = getTranscriptForAudio(transcripts, item.id);
              const urlPending = !useLocalPlayback && !playbackItem.url;

              return (
                <AudioNoteItem
                  key={item.id}
                  item={playbackItem}
                  transcript={transcript}
                  transcripts={transcripts}
                  compact={compact}
                  savedLocally={savedAudioIds?.has(item.id) ?? false}
                  useLocalPlayback={useLocalPlayback}
                  urlPending={urlPending}
                  onTranscribe={
                    onTranscribe
                      ? () => onTranscribe(item.id)
                      : undefined
                  }
                  onUpdateTranscript={
                    onUpdateTranscript
                      ? (text) => onUpdateTranscript(item.id, text)
                      : undefined
                  }
                  onClearTranscript={
                    onClearTranscript
                      ? () => onClearTranscript(item.id)
                      : undefined
                  }
                  onRemove={
                    onRemoveAudio ? () => onRemoveAudio(item.id) : undefined
                  }
                />
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
