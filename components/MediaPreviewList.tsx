"use client";

import type { ResolvedMediaItem } from "@/hooks/useResolvedMedia";
import type { AudioTranscript } from "@/lib/types";
import { getTranscriptForAudio } from "@/lib/transcript-utils";
import { AudioNoteItem } from "./AudioNoteItem";

export interface LocalAudioPlaybackEntry {
  url: string;
  mimeType: string;
  filename: string;
}

interface MediaPreviewListProps {
  photos: ResolvedMediaItem[];
  audio: ResolvedMediaItem[];
  loading?: boolean;
  transcripts?: Record<string, AudioTranscript>;
  compact?: boolean;
  localAudioPlayback?: Record<string, LocalAudioPlaybackEntry>;
  savedAudioIds?: ReadonlySet<string>;
  onRemovePhoto?: (id: string) => void;
  onRemoveAudio?: (id: string) => void;
  onTranscribe?: (audioId: string) => void;
  onUpdateTranscript?: (audioId: string, text: string) => void;
  onClearTranscript?: (audioId: string) => void;
}

export function MediaPreviewList({
  photos,
  audio,
  loading,
  transcripts = {},
  compact = false,
  localAudioPlayback = {},
  savedAudioIds,
  onRemovePhoto,
  onRemoveAudio,
  onTranscribe,
  onUpdateTranscript,
  onClearTranscript,
}: MediaPreviewListProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-16 w-16 rounded-lg bg-slate-200" />
        <div className="h-4 w-32 rounded bg-slate-200" />
      </div>
    );
  }

  if (photos.length === 0 && audio.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
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

      {audio.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">
            {audio.length} audio note{audio.length !== 1 ? "s" : ""}
          </p>
          <ul className="space-y-2">
            {audio.map((item) => {
              const local = localAudioPlayback[item.id];
              const useLocalPlayback = Boolean(local);
              const playbackItem: ResolvedMediaItem = local
                ? {
                    ...item,
                    url: local.url,
                    mimeType: local.mimeType,
                    filename: local.filename,
                  }
                : item;
              const transcript = getTranscriptForAudio(transcripts, item.id);

              return (
                <AudioNoteItem
                  key={item.id}
                  item={playbackItem}
                  transcript={transcript}
                  compact={compact}
                  savedLocally={savedAudioIds?.has(item.id) ?? false}
                  useLocalPlayback={useLocalPlayback}
                  onTranscribe={
                    onTranscribe ? () => onTranscribe(item.id) : undefined
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
