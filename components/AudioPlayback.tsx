"use client";

import { useEffect, useRef, useState } from "react";
import { logAudio, logAudioError } from "@/lib/media-diagnostics";
import {
  canPlayAudioMime,
  isLikelyUnsupportedPlayback,
} from "@/lib/media-utils";

const PLAYBACK_UNSUPPORTED_MESSAGE =
  "This recording was saved, but this browser cannot play the audio format. Try opening it on another device or record again.";

interface AudioPlaybackProps {
  url: string;
  mimeType: string;
  filename: string;
  className?: string;
  logContext?: string;
}

export function AudioPlayback({
  url,
  mimeType,
  filename,
  className = "mt-2 h-8 w-full",
  logContext = "playback",
}: AudioPlaybackProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const playbackBlocked = isLikelyUnsupportedPlayback(mimeType, filename);
  const showUnsupported = playbackBlocked || playbackFailed;

  useEffect(() => {
    logAudio(`${logContext}:init`, {
      filename,
      mimeType,
      canPlayMime: canPlayAudioMime(mimeType),
      playbackLikelyUnsupported: playbackBlocked,
      urlPrefix: url.slice(0, 32),
    });
  }, [url, mimeType, filename, logContext, playbackBlocked]);

  function handlePlaybackError() {
    setPlaybackFailed(true);
    const audio = audioRef.current;
    logAudioError(`${logContext}:error`, {
      filename,
      mimeType,
      mediaErrorCode: audio?.error?.code ?? null,
      mediaErrorMessage: audio?.error?.message ?? null,
    });
  }

  if (showUnsupported) {
    return (
      <p className="mt-2 text-xs text-amber-700" role="status">
        {PLAYBACK_UNSUPPORTED_MESSAGE}
      </p>
    );
  }

  return (
    <audio
      ref={audioRef}
      controls
      src={url}
      className={className}
      onError={handlePlaybackError}
    >
      <source src={url} type={mimeType} />
    </audio>
  );
}
