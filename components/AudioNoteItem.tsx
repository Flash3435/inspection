"use client";

import { useState } from "react";
import { AudioPlayback } from "@/components/AudioPlayback";
import type { ResolvedMediaItem } from "@/hooks/useResolvedMedia";
import type { AudioTranscript } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_LABELS: Record<AudioTranscript["status"], string> = {
  not_started: "Not transcribed",
  transcribing: "Transcribing…",
  completed: "Transcribed",
  failed: "Failed",
};

interface AudioNoteItemProps {
  item: ResolvedMediaItem;
  transcript?: AudioTranscript;
  compact?: boolean;
  onTranscribe?: () => void;
  onUpdateTranscript?: (text: string) => void;
  onClearTranscript?: () => void;
  onRemove?: () => void;
}

export function AudioNoteItem({
  item,
  transcript,
  compact = false,
  onTranscribe,
  onUpdateTranscript,
  onClearTranscript,
  onRemove,
}: AudioNoteItemProps) {
  const [expanded, setExpanded] = useState(!compact);
  const isTranscribing = transcript?.status === "transcribing";
  const isCompleted = transcript?.status === "completed";
  const isFailed = transcript?.status === "failed";
  const canTranscribe = Boolean(onTranscribe) && !isTranscribing;

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-700">
            {item.filename}
          </p>
          <p className="text-[10px] text-slate-400">
            {formatFileSize(item.size)} · {formatDateTime(item.createdAt)}
          </p>
          {transcript && (
            <p className="mt-1 text-[10px] text-slate-500">
              {STATUS_LABELS[transcript.status]}
              {isFailed && transcript.error ? ` — ${transcript.error}` : null}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canTranscribe && (
            <button
              type="button"
              onClick={onTranscribe}
              className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              {isFailed ? "Retry" : "Transcribe"}
            </button>
          )}
          {isTranscribing && (
            <span className="text-[10px] font-medium text-slate-500">
              Transcribing…
            </span>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              disabled={isTranscribing}
              className="text-[10px] font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <AudioPlayback
        key={`${item.id}:${item.url}`}
        url={item.url}
        mimeType={item.mimeType}
        filename={item.filename}
        logContext="note"
      />

      {(isCompleted || isFailed || isTranscribing) && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {compact && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="mb-2 text-[10px] font-medium text-slate-500 hover:text-slate-700"
            >
              {expanded ? "Hide transcript" : "Show transcript"}
            </button>
          )}

          {expanded && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Transcript
                </label>
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  Demo transcription
                </span>
              </div>

              {isTranscribing && (
                <div className="animate-pulse rounded-lg bg-slate-100 px-3 py-4 text-xs text-slate-500">
                  Generating transcript…
                </div>
              )}

              {isFailed && !isTranscribing && (
                <p className="text-xs text-red-600" role="alert">
                  {transcript?.error ?? "Transcription failed."}
                </p>
              )}

              {isCompleted && onUpdateTranscript && (
                <textarea
                  rows={compact ? 2 : 3}
                  value={transcript?.text ?? ""}
                  onChange={(e) => onUpdateTranscript(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              )}

              {isCompleted && !onUpdateTranscript && transcript?.text && (
                <p className="text-xs leading-relaxed text-slate-700">
                  {transcript.text}
                </p>
              )}

              {isCompleted && onClearTranscript && (
                <button
                  type="button"
                  onClick={onClearTranscript}
                  className="text-[10px] font-medium text-slate-500 hover:text-slate-700"
                >
                  Clear transcript
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!transcript && onTranscribe && (
        <p className="mt-2 text-[10px] text-slate-400">
          Transcribe this audio note to convert speech to editable text.
        </p>
      )}
    </li>
  );
}
