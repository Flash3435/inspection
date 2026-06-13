"use client";

import { useEffect, useRef, useState } from "react";
import { AudioRecorder } from "@/components/AudioRecorder";
import { MediaPreviewList } from "@/components/MediaPreviewList";
import { useInspection, useMediaOptions } from "@/context/InspectionContext";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import { OBSERVATION_STATUSES, OBSERVATION_STATUS_LABELS, DISCIPLINES, DISCIPLINE_LABELS, PRIORITIES, PRIORITY_LABELS } from "@/lib/constants";
import {
  deleteMediaForObservation,
  deleteMediaItem,
  mapUploadErrorToUserMessage,
  saveMediaItem,
} from "@/lib/media-service";
import { logMedia, logTranscribe, logTranscribeError } from "@/lib/media-diagnostics";
import {
  generateObservationDraft,
  formatDraftSourceSummary,
} from "@/lib/observation-drafting";
import { transcribeAudio } from "@/lib/transcription";
import {
  pruneTranscripts,
  createTranscriptEntry,
  getTranscriptForAudio,
} from "@/lib/transcript-utils";
import type { AudioTranscript, Observation, ObservationInput } from "@/lib/types";
import { generateId } from "@/lib/utils";

interface ObservationFormProps {
  projectId: string;
  initial?: Observation;
  onSubmit: (input: ObservationInput, observationId: string) => void;
  onCancel: () => void;
  submitLabel?: string;
}

const EMPTY_FORM: ObservationInput = {
  title: "",
  location: "",
  note: "",
  photoIds: [],
  audioIds: [],
  transcripts: {},
  status: "general",
  discipline: "general",
  contractorActionRequired: false,
  codeReferenceIds: [],
};

export function ObservationForm({
  projectId,
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save Observation",
}: ObservationFormProps) {
  const isEditing = Boolean(initial);
  const [observationId] = useState(() => initial?.id ?? generateId());
  const submittedRef = useRef(false);
  const transcribingLocalRef = useRef(new Set<string>());

  const mediaOptions = useMediaOptions();

  const {
    getObservation,
    transcribeObservationAudio,
    updateObservationTranscript,
    clearObservationTranscript,
    ensureDraftObservation,
    patchObservationMediaIds,
    deleteObservation,
    isCloudMode,
  } = useInspection();

  const [form, setForm] = useState<ObservationInput>(() =>
    initial
      ? {
          title: initial.title,
          location: initial.location,
          note: initial.note,
          photoIds: initial.photoIds,
          audioIds: initial.audioIds,
          transcripts: {},
          draftText: initial.draftText,
          status: initial.status,
          discipline: initial.discipline,
          observationNumber: initial.observationNumber,
          contractorActionRequired: initial.contractorActionRequired,
          priority: initial.priority,
          recommendedAction: initial.recommendedAction,
          codeReferenceIds: initial.codeReferenceIds,
          draftWarnings: initial.draftWarnings,
          draftGeneratedAt: initial.draftGeneratedAt,
          draftSourceSummary: initial.draftSourceSummary,
          draftManuallyEdited: initial.draftManuallyEdited,
        }
      : EMPTY_FORM,
  );
  const [localTranscripts, setLocalTranscripts] = useState<
    Record<string, AudioTranscript>
  >(() => (initial ? {} : {}));
  const [draftText, setDraftText] = useState(initial?.draftText ?? "");
  const [draftWarnings, setDraftWarnings] = useState<string[]>(
    initial?.draftWarnings ?? [],
  );
  const [draftGeneratedAt, setDraftGeneratedAt] = useState(
    initial?.draftGeneratedAt ?? "",
  );
  const [draftSourceSummary, setDraftSourceSummary] = useState(
    initial?.draftSourceSummary ?? "",
  );
  const [draftManuallyEdited, setDraftManuallyEdited] = useState(
    initial?.draftManuallyEdited ?? false,
  );
  const [recommendedActionEdited, setRecommendedActionEdited] = useState(
    Boolean(initial?.draftManuallyEdited && initial?.recommendedAction),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [localAudioPlayback, setLocalAudioPlayback] = useState<
    Record<string, { url: string; mimeType: string; filename: string }>
  >({});
  const [savedAudioIds, setSavedAudioIds] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState("");
  const [cloudDraftReady, setCloudDraftReady] = useState(false);
  const draftReady = isEditing || !isCloudMode || cloudDraftReady;

  const storedObservation = getObservation(observationId);
  const transcripts = pruneTranscripts(
    {
      ...(storedObservation?.transcripts ?? {}),
      ...localTranscripts,
    },
    form.audioIds,
  );

  const allMediaIds = [...form.photoIds, ...form.audioIds];
  const { photos, audio, loading: mediaLoading } = useResolvedMedia(allMediaIds);

  useEffect(() => {
    if (isEditing || !isCloudMode) return;

    let cancelled = false;

    void ensureDraftObservation(projectId, observationId)
      .then(() => {
        if (!cancelled) setCloudDraftReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to prepare observation for media upload.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isEditing, isCloudMode, projectId, observationId, ensureDraftObservation]);

  useEffect(() => {
    return () => {
      if (!isEditing && !submittedRef.current) {
        if (isCloudMode) {
          void deleteObservation(observationId);
        } else {
          void deleteMediaForObservation(observationId, mediaOptions);
        }
      }
    };
  }, [isEditing, observationId, mediaOptions, isCloudMode, deleteObservation]);

  useEffect(() => {
    if (!storedObservation) return;
    patchObservationMediaIds(observationId, form.photoIds, form.audioIds);
  }, [
    observationId,
    form.photoIds,
    form.audioIds,
    storedObservation,
    patchObservationMediaIds,
  ]);

  useEffect(() => {
    return () => {
      Object.values(localAudioPlayback).forEach((entry) => {
        URL.revokeObjectURL(entry.url);
      });
    };
  }, [localAudioPlayback]);

  function cacheLocalAudioPlayback(
    mediaId: string,
    blob: Blob,
    filename: string,
    mimeType: string,
  ) {
    const url = URL.createObjectURL(blob);
    setLocalAudioPlayback((prev) => {
      const existing = prev[mediaId];
      if (existing) URL.revokeObjectURL(existing.url);
      return {
        ...prev,
        [mediaId]: { url, mimeType, filename },
      };
    });
    setSavedAudioIds((prev) => new Set(prev).add(mediaId));
  }

  function clearLocalAudioPlayback(mediaId: string) {
    setLocalAudioPlayback((prev) => {
      const entry = prev[mediaId];
      if (entry) URL.revokeObjectURL(entry.url);
      const next = { ...prev };
      delete next[mediaId];
      return next;
    });
    setSavedAudioIds((prev) => {
      const next = new Set(prev);
      next.delete(mediaId);
      return next;
    });
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : undefined;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "priority" && value === ""
            ? undefined
            : value,
    }));
  }

  function mediaUploadErrorMessage(err: unknown, mediaType: "photo" | "audio") {
    return mapUploadErrorToUserMessage(err, mediaType);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (!draftReady) {
      setError("Preparing observation for upload. Please wait a moment and retry.");
      e.target.value = "";
      return;
    }

    setIsUploadingPhoto(true);
    setError("");

    try {
      const newIds: string[] = [];
      for (const file of files) {
        logMedia("form:photo_selected", {
          name: file.name || "(empty)",
          mimeType: file.type || "(empty)",
          size: file.size,
        });
        const saved = await saveMediaItem(
          {
            observationId,
            projectId,
            type: "photo",
            file,
            filename: file.name,
          },
          mediaOptions,
        );
        newIds.push(saved.id);
      }
      setForm((prev) => ({
        ...prev,
        photoIds: [...prev.photoIds, ...newIds],
      }));
    } catch (err) {
      setError(mediaUploadErrorMessage(err, "photo"));
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (!draftReady) {
      setError("Preparing observation for upload. Please wait a moment and retry.");
      e.target.value = "";
      return;
    }

    setIsUploadingAudio(true);
    setError("");

    try {
      const newIds: string[] = [];
      for (const file of files) {
        logMedia("form:audio_selected", {
          name: file.name || "(empty)",
          mimeType: file.type || "(empty)",
          size: file.size,
        });
        const saved = await saveMediaItem(
          {
            observationId,
            projectId,
            type: "audio",
            file,
            filename: file.name,
          },
          mediaOptions,
        );
        cacheLocalAudioPlayback(
          saved.id,
          file,
          file.name,
          file.type || "application/octet-stream",
        );
        newIds.push(saved.id);
      }
      setForm((prev) => ({
        ...prev,
        audioIds: [...prev.audioIds, ...newIds],
      }));
    } catch (err) {
      setError(mediaUploadErrorMessage(err, "audio"));
    } finally {
      setIsUploadingAudio(false);
      e.target.value = "";
    }
  }

  async function handleRecordingSave(blob: Blob, filename: string, mimeType: string) {
    if (!draftReady) {
      setError("Preparing observation for upload. Please wait a moment and retry.");
      return;
    }

    setError("");
    logMedia("form:recording_save", {
      filename,
      mimeType,
      size: blob.size,
    });

    try {
      const saved = await saveMediaItem(
        {
          observationId,
          projectId,
          type: "audio",
          file: blob,
          filename,
        },
        mediaOptions,
      );
      cacheLocalAudioPlayback(saved.id, blob, filename, mimeType);
      setForm((prev) => ({
        ...prev,
        audioIds: [...prev.audioIds, saved.id],
      }));
    } catch (err) {
      setError(mediaUploadErrorMessage(err, "audio"));
    }
  }

  async function removePhoto(id: string) {
    if (!isEditing) {
      await deleteMediaItem(id, mediaOptions);
    }
    setForm((prev) => ({
      ...prev,
      photoIds: prev.photoIds.filter((photoId) => photoId !== id),
    }));
  }

  async function removeAudio(id: string) {
    if (!isEditing) {
      await deleteMediaItem(id, mediaOptions);
      setLocalTranscripts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    clearLocalAudioPlayback(id);
    setForm((prev) => ({
      ...prev,
      audioIds: prev.audioIds.filter((audioId) => audioId !== id),
    }));
  }

  async function handleTranscribe(audioId: string) {
    setError("");

    const before = getTranscriptForAudio(transcripts, audioId);
    logTranscribe("click", {
      audioId,
      projectId,
      observationId,
      isEditing,
      hasStoredObservation: Boolean(storedObservation),
      isCloudMode,
      handler: storedObservation ? "context" : isCloudMode ? "unavailable" : "local",
      statusBefore: before?.status ?? "none",
    });

    if (storedObservation) {
      setLocalTranscripts((prev) => ({
        ...prev,
        [audioId]: createTranscriptEntry(audioId, { status: "transcribing" }),
      }));

      try {
        await transcribeObservationAudio(projectId, observationId, audioId);
        const after = getTranscriptForAudio(
          getObservation(observationId)?.transcripts ?? {},
          audioId,
        );
        logTranscribe("click:after_context", {
          audioId,
          statusAfter: after?.status ?? "none",
        });
        setLocalTranscripts((prev) => {
          const next = { ...prev };
          delete next[audioId];
          return next;
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not transcribe this audio note. Please try again.";
        logTranscribeError("click:context_failed", { audioId }, err);
        setLocalTranscripts((prev) => ({
          ...prev,
          [audioId]: createTranscriptEntry(audioId, {
            status: "failed",
            error: message,
          }),
        }));
        setError(message);
      }
      return;
    }

    if (isCloudMode) {
      const message = "Transcription is not available until the observation is saved.";
      logTranscribe("click:unavailable", { audioId, observationId });
      setLocalTranscripts((prev) => ({
        ...prev,
        [audioId]: createTranscriptEntry(audioId, {
          status: "failed",
          error: message,
        }),
      }));
      setError(message);
      return;
    }

    if (transcribingLocalRef.current.has(audioId)) return;

    transcribingLocalRef.current.add(audioId);
    setLocalTranscripts((prev) => ({
      ...prev,
      [audioId]: createTranscriptEntry(audioId, { status: "transcribing" }),
    }));

    try {
      const text = await transcribeAudio(audioId, mediaOptions);
      const now = new Date().toISOString();
      setLocalTranscripts((prev) => ({
        ...prev,
        [audioId]: {
          ...(prev[audioId] ?? createTranscriptEntry(audioId)),
          status: "completed",
          text,
          error: undefined,
          updatedAt: now,
        },
      }));
      logTranscribe("click:local_success", {
        audioId,
        textLength: text.length,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not transcribe this audio note. Please try again.";
      setLocalTranscripts((prev) => ({
        ...prev,
        [audioId]: {
          ...(prev[audioId] ?? createTranscriptEntry(audioId)),
          status: "failed",
          error: message,
        },
      }));
      logTranscribeError("click:local_failed", { audioId }, err);
    } finally {
      transcribingLocalRef.current.delete(audioId);
    }
  }

  function handleUpdateTranscript(audioId: string, text: string) {
    if (storedObservation) {
      updateObservationTranscript(projectId, observationId, audioId, text);
      return;
    }

    setLocalTranscripts((prev) => ({
      ...prev,
      [audioId]: {
        ...(prev[audioId] ?? createTranscriptEntry(audioId)),
        status: "completed",
        text,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  function handleClearTranscript(audioId: string) {
    if (storedObservation) {
      clearObservationTranscript(projectId, observationId, audioId);
      return;
    }

    setLocalTranscripts((prev) => {
      const next = { ...prev };
      delete next[audioId];
      return next;
    });
  }

  function buildDraftInput() {
    const filenameByAudioId = new Map(
      audio.map((item) => [item.id, item.filename]),
    );

    const completedTranscripts = Object.entries(transcripts)
      .filter(([, entry]) => entry.status === "completed" && entry.text.trim())
      .map(([audioId, entry]) => ({
        audioId,
        text: entry.text.trim(),
        filename: filenameByAudioId.get(audioId),
      }));

    return {
      title: form.title || "Observation",
      location: form.location,
      discipline: form.discipline,
      status: form.status,
      priority: form.priority,
      contractorActionRequired: form.contractorActionRequired,
      note: form.note,
      transcripts: completedTranscripts,
      recommendedAction: form.recommendedAction,
      photoCount: form.photoIds.length,
      attachedAudioCount: form.audioIds.length,
    };
  }

  function applyDraftResult(
    result: Awaited<ReturnType<typeof generateObservationDraft>>,
    overwriteRecommendedAction: boolean,
  ) {
    setDraftText(result.description);
    setDraftWarnings(result.warnings);
    setDraftGeneratedAt(result.generatedAt);
    setDraftSourceSummary(
      formatDraftSourceSummary(result.sourceSummary, result.generatedAt),
    );
    setDraftManuallyEdited(false);
    setRecommendedActionEdited(false);

    if (result.recommendedAction && overwriteRecommendedAction) {
      setForm((prev) => ({
        ...prev,
        recommendedAction: result.recommendedAction,
      }));
    }
  }

  async function runDraftGeneration(forceRegenerate: boolean) {
    if (
      forceRegenerate &&
      draftManuallyEdited &&
      !window.confirm(
        "Regenerating will replace your edited draft text. Continue?",
      )
    ) {
      return;
    }

    if (
      forceRegenerate &&
      recommendedActionEdited &&
      form.recommendedAction?.trim() &&
      !window.confirm(
        "Regenerating may replace your edited recommended action. Continue?",
      )
    ) {
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const result = await generateObservationDraft(buildDraftInput());
      const overwriteRecommendedAction =
        forceRegenerate ||
        !form.recommendedAction?.trim() ||
        !recommendedActionEdited;

      applyDraftResult(result, overwriteRecommendedAction);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate observation draft.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateDraft() {
    if (
      draftText.trim() &&
      draftManuallyEdited &&
      !window.confirm(
        "You have manually edited the draft. Generate a new draft anyway?",
      )
    ) {
      return;
    }

    await runDraftGeneration(false);
  }

  async function handleRegenerateDraft() {
    await runDraftGeneration(true);
  }

  function handleClearDraft() {
    if (
      draftText.trim() &&
      !window.confirm("Clear the generated draft text?")
    ) {
      return;
    }

    setDraftText("");
    setDraftWarnings([]);
    setDraftGeneratedAt("");
    setDraftSourceSummary("");
    setDraftManuallyEdited(false);
    setRecommendedActionEdited(false);
  }

  function handleDraftTextChange(value: string) {
    setDraftText(value);
    setDraftManuallyEdited(true);
  }

  function handleRecommendedActionChange(
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) {
    handleChange(e);
    setRecommendedActionEdited(true);
    if (draftGeneratedAt) {
      setDraftManuallyEdited(true);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    submittedRef.current = true;

    const finalTranscripts = pruneTranscripts(
      isEditing && storedObservation
        ? storedObservation.transcripts
        : localTranscripts,
      form.audioIds,
    );

    onSubmit(
      {
        ...form,
        draftText,
        draftWarnings,
        draftGeneratedAt: draftGeneratedAt || undefined,
        draftSourceSummary: draftSourceSummary || undefined,
        draftManuallyEdited,
        transcripts: finalTranscripts,
      },
      observationId,
    );
  }

  async function handleCancel() {
    if (!isEditing) {
      if (isCloudMode) {
        await deleteObservation(observationId);
      } else {
        await deleteMediaForObservation(observationId, mediaOptions);
      }
    }
    onCancel();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-slate-700"
            >
              Title *
            </label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. AHU-2 belt wear"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-slate-700"
            >
              Location
            </label>
            <input
              id="location"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Mechanical room, Level 3"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-slate-700"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            value={form.status}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {OBSERVATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {OBSERVATION_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="flex w-full items-center justify-between text-sm font-medium text-slate-700"
          >
            Advanced Fields
            <span className="text-xs text-slate-400">
              {showAdvanced ? "Hide" : "Show"}
            </span>
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="discipline"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Discipline
                  </label>
                  <select
                    id="discipline"
                    name="discipline"
                    value={form.discipline}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    {DISCIPLINES.map((discipline) => (
                      <option key={discipline} value={discipline}>
                        {DISCIPLINE_LABELS[discipline]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="priority"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={form.priority ?? ""}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="">Not set</option>
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {PRIORITY_LABELS[priority]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="observationNumber"
                  className="block text-sm font-medium text-slate-700"
                >
                  Observation Number
                </label>
                <input
                  id="observationNumber"
                  name="observationNumber"
                  value={form.observationNumber ?? ""}
                  onChange={handleChange}
                  placeholder="Optional — auto-generated in report (e.g. M-001)"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="contractorActionRequired"
                  checked={form.contractorActionRequired}
                  onChange={handleChange}
                  className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                />
                Contractor action required
              </label>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="note"
            className="block text-sm font-medium text-slate-700"
          >
            Field Notes
          </label>
          <textarea
            id="note"
            name="note"
            rows={4}
            value={form.note}
            onChange={handleChange}
            placeholder="Describe what you observed on site…"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Photos
            </label>
            <div className="mt-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <input
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif,image/webp,image/*"
                multiple
                disabled={isUploadingPhoto || !draftReady}
                onChange={handlePhotoChange}
                className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 disabled:opacity-50"
              />
              {isUploadingPhoto && (
                <p className="mt-2 text-xs text-slate-500">Saving photos…</p>
              )}
              {!draftReady && isCloudMode && (
                <p className="mt-2 text-xs text-slate-500">
                  Preparing observation for media upload…
                </p>
              )}
              <div className="mt-3">
                <MediaPreviewList
                  photos={photos}
                  audio={[]}
                  loading={mediaLoading && form.photoIds.length > 0}
                  onRemovePhoto={removePhoto}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Record New Audio Note
            </label>
            <div className="mt-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <AudioRecorder
                onSave={handleRecordingSave}
                disabled={isUploadingAudio}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Audio Notes
            </label>
            <div className="mt-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <input
                type="file"
                accept="audio/mp4,audio/aac,audio/mpeg,audio/webm,audio/ogg,audio/*"
                multiple
                disabled={isUploadingAudio || !draftReady}
                onChange={handleAudioUpload}
                className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 disabled:opacity-50"
              />
              <p className="mt-2 text-xs text-slate-400">
                Upload existing audio files, or use the recorder above.
              </p>
              {isUploadingAudio && (
                <p className="mt-2 text-xs text-slate-500">Saving audio…</p>
              )}
              <div className="mt-3">
                <MediaPreviewList
                  photos={[]}
                  audio={audio}
                  loading={mediaLoading && form.audioIds.length > 0}
                  transcripts={transcripts}
                  localAudioPlayback={localAudioPlayback}
                  savedAudioIds={savedAudioIds}
                  onRemoveAudio={removeAudio}
                  onTranscribe={handleTranscribe}
                  onUpdateTranscript={handleUpdateTranscript}
                  onClearTranscript={handleClearTranscript}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Observation Draft
              </label>
              <p className="mt-1 text-xs text-slate-500">
                AI-assisted draft — review before issue
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {draftText.trim() ? (
                <>
                  <button
                    type="button"
                    onClick={handleRegenerateDraft}
                    disabled={isGenerating}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                  >
                    {isGenerating ? "Generating…" : "Regenerate Draft"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    disabled={isGenerating}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
                  >
                    Clear Draft
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateDraft}
                  disabled={isGenerating}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                >
                  {isGenerating ? "Generating…" : "Generate Observation Draft"}
                </button>
              )}
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Uses field notes, transcripts, title, location, discipline, status,
            priority, contractor action flag, and photo count.
          </p>

          {draftWarnings.length > 0 && (
            <div
              className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              role="status"
            >
              <p className="font-medium">Review notes</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {draftWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <label
              htmlFor="draftText"
              className="block text-xs font-medium text-slate-600"
            >
              Generated Description
            </label>
            <textarea
              id="draftText"
              rows={4}
              value={draftText}
              onChange={(e) => handleDraftTextChange(e.target.value)}
              placeholder="Professional site-report wording will appear here after generation…"
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="mt-4">
            <label
              htmlFor="draftRecommendedAction"
              className="block text-xs font-medium text-slate-600"
            >
              Recommended / Required Action
            </label>
            <textarea
              id="draftRecommendedAction"
              rows={2}
              value={form.recommendedAction ?? ""}
              onChange={handleRecommendedActionChange}
              placeholder="Generated or manual corrective action wording…"
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          {draftSourceSummary && (
            <p className="mt-3 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Based on:</span>{" "}
              {draftSourceSummary}
            </p>
          )}

          {draftManuallyEdited && draftText.trim() && (
            <p className="mt-2 text-xs text-slate-500">
              Draft has been manually edited. Use Regenerate Draft to create a
              new AI-assisted version.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
