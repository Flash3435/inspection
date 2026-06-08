"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { ReportPreview } from "@/components/ReportPreview";
import { useInspection } from "@/context/InspectionContext";
import {
  buildDocxFilename,
  DEFAULT_DOCX_EXPORT_STYLE,
  downloadSiteObservationReportDocx,
} from "@/lib/docx-export";
import { loadExportPhotos } from "@/lib/export-images";
import { mockGenerateReport } from "@/lib/mock-ai";
import type { SiteObservationReport } from "@/lib/types";

export default function ReportPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { hydrated, getProject, getObservationsForProject, mediaOptions } =
    useInspection();
  const [report, setReport] = useState<SiteObservationReport | null>(null);
  const [reportProjectId, setReportProjectId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const project = hydrated ? getProject(projectId) : undefined;
  const observations = hydrated ? getObservationsForProject(projectId) : [];
  const loading = Boolean(
    hydrated && project && reportProjectId !== projectId,
  );

  useEffect(() => {
    if (!hydrated || !project) return;

    let cancelled = false;

    mockGenerateReport(project, getObservationsForProject(projectId)).then(
      (draft) => {
        if (!cancelled) {
          setReport(draft);
          setReportProjectId(projectId);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [hydrated, projectId, project, getObservationsForProject]);

  async function handleDownloadDocx() {
    if (!report) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const mediaIds = report.photoAppendix.map((photo) => photo.mediaId);
      const photos = await loadExportPhotos(mediaIds, mediaOptions);
      await downloadSiteObservationReportDocx(report, photos, {
        exportStyle: DEFAULT_DOCX_EXPORT_STYLE,
      });
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : "Failed to generate Word document.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  if (!hydrated) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-96 rounded-xl bg-slate-200" />
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <EmptyState
          title="Project not found"
          description="This project may have been deleted or the link is invalid."
          action={
            <Link
              href="/"
              className="inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white"
            >
              Back to Dashboard
            </Link>
          }
        />
      </AppShell>
    );
  }

  if (observations.length === 0) {
    return (
      <AppShell>
        <div className="mb-8">
          <Link
            href={`/projects/${projectId}`}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            ← Back to Project
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Report Preview
          </h1>
        </div>
        <EmptyState
          title="No observations to preview"
          description="Add at least one field observation before previewing or exporting a Site Observation Report."
          action={
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Back to Project
            </Link>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          ← Back to Project
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          Report Preview
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          This preview uses the same structured data as the Word export for{" "}
          {project.name}.
        </p>

        {report && !loading && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isExporting}
              className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
            >
              {isExporting ? "Preparing Word Report…" : "Download Word Report"}
            </button>
            <span className="text-xs text-slate-400">
              {buildDocxFilename(report)}
            </span>
          </div>
        )}

        {exportError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {exportError}
          </p>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-8">
          <div className="h-6 w-1/2 rounded bg-slate-200" />
          <div className="mt-6 space-y-4">
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-5/6 rounded bg-slate-100" />
            <div className="h-4 w-4/6 rounded bg-slate-100" />
          </div>
        </div>
      ) : report ? (
        <ReportPreview report={report} />
      ) : null}
    </AppShell>
  );
}
