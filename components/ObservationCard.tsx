"use client";

import { useState } from "react";
import { DISCIPLINE_LABELS } from "@/lib/constants";
import type { Observation } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { useInspection } from "@/context/InspectionContext";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import { getCompletedTranscriptTexts } from "@/lib/transcript-utils";
import { MediaPreviewList } from "./MediaPreviewList";
import { StatusBadge } from "./StatusBadge";

interface ObservationCardProps {
  observation: Observation;
  onEdit: () => void;
  onDelete: () => void;
}

function SummaryBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "bg-amber-50 text-amber-800"
        : tone === "info"
          ? "bg-sky-50 text-sky-800"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function ObservationCard({
  observation,
  onEdit,
  onDelete,
}: ObservationCardProps) {
  const {
    transcribeObservationAudio,
    updateObservationTranscript,
    clearObservationTranscript,
  } = useInspection();

  const displayText = observation.draftText || observation.note;
  const hasReviewedDraft = Boolean(observation.draftText.trim());
  const transcriptCount = getCompletedTranscriptTexts(
    observation.transcripts,
  ).length;
  const photoCount = observation.photoIds.length;
  const audioCount = observation.audioIds.length;
  const allMediaIds = [...observation.photoIds, ...observation.audioIds];
  const [showMedia, setShowMedia] = useState(false);
  const { photos, audio, loading } = useResolvedMedia(
    showMedia ? allMediaIds : [],
  );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              {observation.title}
            </h3>
            <StatusBadge status={observation.status} />
          </div>
          {observation.location && (
            <p className="mt-1 text-sm text-slate-500">{observation.location}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hasReviewedDraft ? (
              <SummaryBadge tone="success">Draft ready</SummaryBadge>
            ) : (
              <SummaryBadge tone="warning">Needs draft</SummaryBadge>
            )}
            {observation.contractorActionRequired && (
              <SummaryBadge tone="warning">Action required</SummaryBadge>
            )}
            {photoCount > 0 && (
              <SummaryBadge tone="info">
                Photos: {photoCount}
              </SummaryBadge>
            )}
            {transcriptCount > 0 && (
              <SummaryBadge tone="info">Transcript available</SummaryBadge>
            )}
            {audioCount > 0 && transcriptCount === 0 && (
              <SummaryBadge>Audio attached</SummaryBadge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      </div>

      {displayText && (
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {displayText}
        </p>
      )}

      {hasReviewedDraft && (
        <p className="mt-2 text-xs text-slate-500">
          AI-assisted draft — review before issue
          {observation.draftGeneratedAt
            ? ` · ${formatDateTime(observation.draftGeneratedAt)}`
            : ""}
        </p>
      )}

      {observation.draftWarnings && observation.draftWarnings.length > 0 && (
        <p className="mt-2 text-xs text-amber-700">
          {observation.draftWarnings[0]}
          {observation.draftWarnings.length > 1
            ? ` (+${observation.draftWarnings.length - 1} more)`
            : ""}
        </p>
      )}

      {observation.recommendedAction?.trim() && (
        <p className="mt-2 text-xs text-slate-600">
          <span className="font-medium text-slate-500">Action:</span>{" "}
          {observation.recommendedAction}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>{DISCIPLINE_LABELS[observation.discipline]}</span>
        <span>Updated {formatDateTime(observation.updatedAt)}</span>
      </div>

      {allMediaIds.length > 0 && (
        <div className="mt-3">
          {!showMedia ? (
            <button
              type="button"
              onClick={() => setShowMedia(true)}
              className="text-xs font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Show media ({photoCount > 0 ? `${photoCount} photo${photoCount !== 1 ? "s" : ""}` : ""}
              {photoCount > 0 && audioCount > 0 ? ", " : ""}
              {audioCount > 0 ? `${audioCount} audio` : ""})
            </button>
          ) : (
            <MediaPreviewList
              photos={photos}
              audio={audio}
              loading={loading}
              transcripts={observation.transcripts}
              compact
              onTranscribe={(audioId) =>
                void transcribeObservationAudio(
                  observation.projectId,
                  observation.id,
                  audioId,
                )
              }
              onUpdateTranscript={(audioId, text) =>
                updateObservationTranscript(
                  observation.projectId,
                  observation.id,
                  audioId,
                  text,
                )
              }
              onClearTranscript={(audioId) =>
                clearObservationTranscript(
                  observation.projectId,
                  observation.id,
                  audioId,
                )
              }
            />
          )}
        </div>
      )}
    </article>
  );
}
