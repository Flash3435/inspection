import { getMediaBlobForExport } from "./media-service";

export type ExportImageType = "jpg" | "png" | "gif" | "bmp";

export interface ExportPhotoData {
  mediaId: string;
  data: Uint8Array;
  type: ExportImageType;
  width: number;
  height: number;
}

const MAX_EXPORT_WIDTH = 480;

function mimeToExportType(mimeType: string): ExportImageType {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("bmp")) return "bmp";
  return "jpg";
}

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

async function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      async (jpegBlob) => {
        if (!jpegBlob) {
          resolve(null);
          return;
        }
        resolve(await blobToUint8Array(jpegBlob));
      },
      "image/jpeg",
      0.85,
    );
  });
}

async function preparePhotoBlob(
  mediaId: string,
  blob: Blob,
  mimeType: string,
): Promise<ExportPhotoData | null> {
  try {
    const img = await loadImageFromBlob(blob);
    let width = img.naturalWidth;
    let height = img.naturalHeight;

    if (width === 0 || height === 0) return null;

    if (width > MAX_EXPORT_WIDTH) {
      height = Math.round((height * MAX_EXPORT_WIDTH) / width);
      width = MAX_EXPORT_WIDTH;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, width, height);

    const exportType = mimeToExportType(mimeType);
    const needsConversion =
      exportType === "gif" ||
      exportType === "bmp" ||
      mimeType.includes("webp") ||
      !mimeType.startsWith("image/");

    if (needsConversion) {
      const data = await canvasToJpegBlob(canvas);
      if (!data) return null;
      return { mediaId, data, type: "jpg", width, height };
    }

    if (exportType === "png") {
      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!pngBlob) return null;
      return {
        mediaId,
        data: await blobToUint8Array(pngBlob),
        type: "png",
        width,
        height,
      };
    }

    const data = await canvasToJpegBlob(canvas);
    if (!data) return null;
    return { mediaId, data, type: "jpg", width, height };
  } catch {
    return null;
  }
}

export async function loadExportPhotos(
  mediaIds: string[],
  mediaOptions: {
    userId?: string | null;
    client: import("@supabase/supabase-js").SupabaseClient | null;
  },
): Promise<Map<string, ExportPhotoData>> {
  const uniqueIds = [...new Set(mediaIds)];
  if (uniqueIds.length === 0) return new Map();

  const result = new Map<string, ExportPhotoData>();

  for (const mediaId of uniqueIds) {
    const item = await getMediaBlobForExport(mediaId, mediaOptions);
    if (!item) continue;
    const prepared = await preparePhotoBlob(mediaId, item.blob, item.mimeType);
    if (prepared) {
      result.set(mediaId, prepared);
    }
  }

  return result;
}
