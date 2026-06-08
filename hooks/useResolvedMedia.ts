"use client";

import { useEffect, useMemo, useState } from "react";
import {
  resolveMediaByIds,
  type MediaType,
} from "@/lib/media-service";
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

export function useResolvedMedia(ids: string[]) {
  const mediaOptions = useMediaOptions();
  const idsKey = useMemo(() => ids.join(","), [ids]);
  const [items, setItems] = useState<ResolvedMediaItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = ids.length > 0 && loadedKey !== idsKey;
  const resolvedItems = useMemo(() => {
    if (ids.length === 0) return [];
    return loadedKey !== idsKey ? [] : items;
  }, [ids.length, loadedKey, idsKey, items]);

  useEffect(() => {
    if (ids.length === 0) return;

    let cancelled = false;

    resolveMediaByIds(ids, mediaOptions)
      .then((resolved) => {
        if (cancelled) return;
        setItems(resolved);
        setLoadedKey(idsKey);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load media");
        setItems([]);
        setLoadedKey(idsKey);
      });

    return () => {
      cancelled = true;
      items.forEach((item) => {
        if (item.url.startsWith("blob:")) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only latest resolved URLs
  }, [idsKey, ids, mediaOptions.userId]);

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
