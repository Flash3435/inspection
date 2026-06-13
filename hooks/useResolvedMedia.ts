"use client";

import { useEffect, useMemo, useState } from "react";
import {
  resolveMediaByIds,
  type MediaType,
} from "@/lib/media-service";
import { logMedia, logMediaError } from "@/lib/media-diagnostics";
import { useMediaOptions } from "@/context/InspectionContext";

export interface ResolvedMediaItem {
  id: string;
  type: MediaType;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
}

const RESOLVE_TIMEOUT_MS = 20000;

function withResolveTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Media resolve timed out."));
    }, RESOLVE_TIMEOUT_MS);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function useResolvedMedia(ids: string[]) {
  const mediaOptions = useMediaOptions();
  const idsKey = useMemo(() => ids.join(","), [ids]);
  const [items, setItems] = useState<ResolvedMediaItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = ids.length > 0 && loadedKey !== idsKey;
  const resolvedItems = useMemo(() => {
    if (ids.length === 0) return [];
    if (loadedKey === idsKey) return items;
    const idSet = new Set(ids);
    return items.filter((item) => idSet.has(item.id));
  }, [loadedKey, idsKey, items, ids]);

  useEffect(() => {
    if (ids.length === 0) return;

    let cancelled = false;

    logMedia("resolve:hook_start", { idsKey, count: ids.length });

    withResolveTimeout(resolveMediaByIds(ids, mediaOptions))
      .then((resolved) => {
        if (cancelled) return;
        setItems(resolved);
        setLoadedKey(idsKey);
        setError(null);
        logMedia("resolve:hook_success", {
          idsKey,
          count: resolved.length,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        logMediaError("resolve:hook_failed", { idsKey }, err);
        setError(err instanceof Error ? err.message : "Failed to load media");
        setLoadedKey(idsKey);
      });

    return () => {
      cancelled = true;
    };
  }, [idsKey, mediaOptions.userId, mediaOptions.client]);

  const photos = useMemo(
    () => resolvedItems.filter((item) => item.type === "photo"),
    [resolvedItems],
  );
  const audio = useMemo(
    () => resolvedItems.filter((item) => item.type === "audio"),
    [resolvedItems],
  );

  return { items: resolvedItems, photos, audio, loading, error };
}
