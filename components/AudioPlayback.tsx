"use client";

import { useEffect, useRef, useState } from "react";
import { logAudio, logAudioError } from "@/lib/media-diagnostics";
import {
  canPlayAudioMime,
  isLikelyUnsupportedPlayback,
} from "@/lib/media-utils";

const SAVED_UNSUPPORTED_MESSAGE =
  "This recording was saved, but this browser cannot play the saved audio format.";

const PREVIEW_UNSUPPORTED_MESSAGE =
  "This recording was saved, but this browser cannot play the audio format. Try opening it on another device or record again.";

interface AudioPlaybackProps {
  url: string;
  mimeType: string;
  filename: string;
  className?: string;
  logContext?: string;
  saved?: boolean;
  useLocalPlayback?: boolean;
}

export function AudioPlayback({
  url,
  mimeType,
  filename,
  className = "mt-2 h-8 w-full",
  logContext = "playback",
  saved = true,
  useLocalPlayback = false,
}: AudioPlaybackProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const playbackBlocked =
    !useLocalPlayback && isLikelyUnsupportedPlayback(mimeType, filename);
  const showUnsupported = playbackBlocked || playbackFailed;
  const unsupportedMessage = saved
    ? SAVED_UNSUPPORTED_MESSAGE
    : PREVIEW_UNSUPPORTED_MESSAGE;

  useEffect(() => {
    logAudio(`${logContext}:init`, {
      filename,
      mimeType,
      canPlayMime: canPlayAudioMime(mimeType),
      playbackLikelyUnsupported: playbackBlocked,
      hasUrl: Boolean(url),
      urlPrefix: url ? url.slice(0, 32) : "(empty)",
      saved,
      useLocalPlayback,
    });
  }, [
    url,
    mimeType,
    filename,
    logContext,
    playbackBlocked,
    saved,
    useLocalPlayback,
  ]);

  function handlePlaybackError() {
    setPlaybackFailed(true);
    const audio = audioRef.current;
    logAudioError(`${logContext}:error`, {
      filename,
      mimeType,
      hasUrl: Boolean(url),
      mediaErrorCode: audio?.error?.code ?? null,
      mediaErrorMessage: audio?.error?.message ?? null,
      saved,
      useLocalPlayback,
    });
  }

  const downloadLink = url
    ? (
        <a
          href={url}
          download={filename || "audio"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-medium text-slate-600 underline hover:text-slate-800"
        >
          {saved ? "Download audio" : "Open audio file"}
        </a>
      )
    : null;

  if (!url) {
    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs text-amber-700" role="status">
          {unsupportedMessage}
        </p>
        {downloadLink}
      </div>
    );
  }

  if (showUnsupported) {
    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs text-amber-700" role="status">
          {unsupportedMessage}
        </p>
        {downloadLink}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <audio
        ref={audioRef}
        controls
        className={className}
        onError={handlePlaybackError}
      >
        <source src={url} type={mimeType} />
      </audio>
      {downloadLink}
    </div>
  );
}
