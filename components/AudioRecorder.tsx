"use client";

import { useEffect, useRef, useState } from "react";
import { logAudio, logAudioError } from "@/lib/media-diagnostics";
import {
  detectBrowserAudioContext,
  extensionForAudioMime,
  getRecorderMimeSupport,
  getSupportedRecorderMimeType,
  resolveRecordedMime,
} from "@/lib/media-utils";
import { formatDateTime } from "@/lib/utils";
import { AudioPlayback } from "@/components/AudioPlayback";

interface AudioRecorderProps {
  onSave: (blob: Blob, filename: string, mimeType: string) => void;
  disabled?: boolean;
}

type RecorderState = "idle" | "recording" | "preview";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function timestampSlug(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export function AudioRecorder({ onSave, disabled }: AudioRecorderProps) {
  const [mimeType, setMimeType] = useState<string | null>(() =>
    getSupportedRecorderMimeType(),
  );
  const isSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    mimeType !== null;

  const [state, setState] = useState<RecorderState>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>("");
  const [previewMime, setPreviewMime] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const activeMimeTypeRef = useRef<string | null>(mimeType);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setPreviewFilename("");
    setPreviewMime("");
    setDuration(0);
  }

  function resetToIdle() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    stopStream();
    clearPreview();
    setState("idle");
    setError(null);
  }

  useEffect(() => {
    const browser = detectBrowserAudioContext();
    const selectedMime = getSupportedRecorderMimeType();
    logAudio("recorder:init", {
      ...browser,
      selectedMimeType: selectedMime,
      mimeSupport: getRecorderMimeSupport(),
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      mediaRecorderRef.current?.stop();
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function startRecording() {
    const selectedMime = getSupportedRecorderMimeType();
    if (!selectedMime) {
      setError(
        "In-browser recording is not supported in this browser. Use the upload option below instead.",
      );
      return;
    }

    setMimeType(selectedMime);
    activeMimeTypeRef.current = selectedMime;
    setError(null);
    clearPreview();

    logAudio("recorder:start", {
      mimeType: selectedMime,
      browser: detectBrowserAudioContext(),
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: selectedMime });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const recordedMime = activeMimeTypeRef.current ?? selectedMime;
        const blob = new Blob(chunksRef.current, {
          type: recordedMime || "",
        });
        const resolvedMime = resolveRecordedMime(blob, recordedMime);
        const extension = extensionForAudioMime(resolvedMime);
        const filename = `recording-${timestampSlug()}.${extension}`;

        logAudio("recorder:stopped", {
          selectedMimeType: recordedMime,
          blobMimeType: blob.type || "(empty)",
          resolvedMimeType: resolvedMime,
          filename,
          size: blob.size,
          chunkCount: chunksRef.current.length,
        });

        const normalizedBlob =
          blob.type === resolvedMime
            ? blob
            : new Blob([blob], { type: resolvedMime });

        const url = URL.createObjectURL(normalizedBlob);
        setPreviewBlob(normalizedBlob);
        setPreviewMime(resolvedMime);
        setPreviewFilename(filename);
        setPreviewUrl(url);
        setState("preview");
        stopStream();
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recorder.start();
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      setState("recording");
    } catch (err) {
      logAudioError("recorder:start_failed", {
        mimeType: selectedMime,
      }, err);
      stopStream();
      setError(
        "Microphone access was denied or is unavailable. Check browser permissions and try again.",
      );
      setState("idle");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function handleSaveRecording() {
    if (!previewBlob) return;

    setIsSaving(true);
    const resolvedMime = resolveRecordedMime(
      previewBlob,
      mimeType,
      previewFilename,
    );
    const extension = extensionForAudioMime(resolvedMime);
    const filename =
      previewFilename || `recording-${timestampSlug()}.${extension}`;

    logAudio("recorder:save", {
      filename,
      mimeType: resolvedMime,
      blobMimeType: previewBlob.type || "(empty)",
      size: previewBlob.size,
    });

    const normalizedBlob =
      previewBlob.type === resolvedMime
        ? previewBlob
        : new Blob([previewBlob], { type: resolvedMime });

    onSave(normalizedBlob, filename, resolvedMime);
    resetToIdle();
    setIsSaving(false);
  }

  if (!isSupported) {
    return (
      <p className="text-xs text-slate-500">
        In-browser recording is not supported in this browser. Use the upload
        option below instead.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {state === "idle" && (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          Start Recording
        </button>
      )}

      {state === "recording" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-red-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording {formatDuration(duration)}
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            Stop
          </button>
        </div>
      )}

      {state === "preview" && previewUrl && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium text-slate-500">
            Preview — {formatDuration(duration)} recorded{" "}
            {formatDateTime(new Date().toISOString())}
            {previewMime ? ` · ${previewMime}` : ""}
          </p>
          <AudioPlayback
            key={previewUrl}
            url={previewUrl}
            mimeType={previewMime}
            filename={previewFilename}
            className="w-full"
            logContext="recorder:preview"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveRecording}
              disabled={isSaving}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
            >
              Save to Observation
            </button>
            <button
              type="button"
              onClick={resetToIdle}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
