import type { ExportPhotoData } from "./export-images";
import type { SiteObservationReport } from "./types";
import {
  buildSiteObservationReportDocxBlob,
} from "./docx-export/build-document";
import type { DocxExportOptions } from "./docx-export/types";

export type { DocxExportOptions, DocxExportStyle } from "./docx-export/types";
export { DEFAULT_DOCX_EXPORT_STYLE } from "./docx-export/types";

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, " ").trim();
}

export function buildDocxFilename(report: SiteObservationReport): string {
  const base =
    report.cover.projectNumber?.trim() || report.cover.projectName.trim();
  return `${sanitizeFilename(base)} - Site Observation Report.docx`;
}

export async function buildSiteObservationReportDocx(
  report: SiteObservationReport,
  photos: Map<string, ExportPhotoData>,
  options?: DocxExportOptions,
): Promise<Blob> {
  return buildSiteObservationReportDocxBlob(report, photos, options);
}

export async function downloadSiteObservationReportDocx(
  report: SiteObservationReport,
  photos: Map<string, ExportPhotoData>,
  options?: DocxExportOptions,
): Promise<void> {
  const blob = await buildSiteObservationReportDocxBlob(report, photos, options);
  const filename = buildDocxFilename(report);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
