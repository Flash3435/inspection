"use client";

import { useMemo } from "react";
import { useResolvedMedia } from "@/hooks/useResolvedMedia";
import {
  DISCIPLINE_LABELS,
  OFFICIAL_DISTRIBUTION_COMPANY,
  OFFICIAL_DISTRIBUTION_RECIPIENTS,
  OFFICIAL_SITE_OBSERVATION_DISCLAIMER,
  PRIORITY_LABELS,
} from "@/lib/constants";
import { formatReportPhotoCaption } from "@/lib/report-utils";
import type {
  ReportObservationEntry,
  SiteObservationReport,
} from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

interface ReportPreviewProps {
  report: SiteObservationReport;
}

function MetadataCell({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <>
      <dt className="border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </dt>
      <dd className="border border-slate-200 px-3 py-2 text-sm text-slate-800">
        {value?.trim() || "—"}
      </dd>
    </>
  );
}

function InlineFigures({ item }: { item: ReportObservationEntry }) {
  const { items, loading } = useResolvedMedia(item.photoIds);
  const urlById = useMemo(
    () => new Map(items.map((media) => [media.id, media.url])),
    [items],
  );

  if (item.photoIds.length === 0) return null;

  if (loading) {
    return (
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {item.photoIds.map((id) => (
          <div
            key={id}
            className="aspect-video animate-pulse rounded border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      {item.photoReferences.map((reference, index) => {
        const photoId = item.photoIds[index];
        const url = urlById.get(photoId);
        const caption = formatReportPhotoCaption({
          reference,
          observationNumber: item.displayNumber,
          observationTitle: item.title,
          caption: item.title,
          mediaId: photoId,
          location: item.location,
          discipline: item.discipline,
          status: item.status,
        });

        return (
          <figure
            key={photoId}
            className="overflow-hidden rounded border border-slate-200 bg-white"
          >
            <div className="aspect-video bg-slate-100">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={caption}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center text-xs text-slate-400">
                  <p>Photo unavailable</p>
                  <p className="mt-1 text-[10px]">
                    The image may have been removed or is not accessible in this
                    browser.
                  </p>
                </div>
              )}
            </div>
            <figcaption className="px-3 py-2 text-xs font-semibold text-slate-700">
              {caption}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function ProgressItem({
  item,
  index,
}: {
  item: ReportObservationEntry;
  index: number;
}) {
  const locationSuffix =
    item.location !== "Not specified" ? ` (${item.location})` : "";

  return (
    <article className="border-b border-slate-200 pb-6 last:border-0">
      <p className="text-sm leading-relaxed text-slate-800">
        <span className="font-bold">{index + 1}.</span> {item.title}
        {locationSuffix}: {item.reportText}
      </p>
      <InlineFigures item={item} />
    </article>
  );
}

function DeficiencyGroup({
  disciplineIndex,
  disciplineLabel,
  items,
}: {
  disciplineIndex: number;
  disciplineLabel: string;
  items: ReportObservationEntry[];
}) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
        {disciplineIndex}. {disciplineLabel}
      </h3>
      <div className="mt-3 space-y-5">
        {items.map((item, itemIndex) => {
          const action = item.recommendedAction?.trim();
          const narrative = action
            ? `During the site observation, it was noted that ${item.reportText} ${action}`
            : `During the site observation, it was noted that ${item.reportText}`;

          return (
            <article key={item.id}>
              <p className="text-sm leading-relaxed text-slate-800">
                <span className="font-bold">
                  {disciplineIndex}.{itemIndex + 1}
                </span>{" "}
                {narrative}
              </p>
              <InlineFigures item={item} />
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function ReportPreview({ report }: ReportPreviewProps) {
  const { cover } = report;

  const deficiencyGroups = useMemo(() => {
    const groups = new Map<string, ReportObservationEntry[]>();
    for (const item of report.deficiencyItems) {
      const existing = groups.get(item.discipline) ?? [];
      existing.push(item);
      groups.set(item.discipline, existing);
    }
    return Array.from(groups.entries()).map(([discipline, items]) => ({
      discipline,
      disciplineLabel: DISCIPLINE_LABELS[items[0].discipline],
      items,
    }));
  }, [report.deficiencyItems]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm print:border-black print:shadow-none">
      <header className="border-b-2 border-slate-800 bg-slate-50 px-8 py-10 print:px-0">
        <p className="text-center text-xs italic text-slate-400">
          [H.H. Angus Logo / Letterhead]
        </p>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-wide text-slate-900 print:text-xl">
          SITE OBSERVATION REPORT
        </h1>
        <p className="mt-2 text-center text-xs text-slate-500">
          Draft generated {formatDateTime(cover.generatedAt)}
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-0 overflow-hidden rounded-lg border border-slate-300">
          <MetadataCell label="Project" value={cover.projectName} />
          <MetadataCell label="Project No" value={cover.projectNumber} />
          <MetadataCell
            label="Location"
            value={cover.siteAddress ?? cover.siteName}
          />
          <MetadataCell label="Report No" value={cover.reportNumber} />
          <MetadataCell label="Contractor" value={cover.contractorName} />
          <MetadataCell
            label="Date of Visit"
            value={cover.visitDate ? formatDate(cover.visitDate) : undefined}
          />
          <MetadataCell
            label="Building Permit No"
            value={cover.buildingPermitNo}
          />
          <MetadataCell
            label="Report Date"
            value={cover.reportDate ? formatDate(cover.reportDate) : undefined}
          />
        </dl>

        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="font-semibold text-slate-700">
              Reason for Site Visit:
            </span>{" "}
            {cover.reasonForVisit?.trim() || "—"}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Present:</span>{" "}
            {cover.peoplePresent?.trim() || "—"}
          </p>
        </div>

        <div className="mt-6 space-y-3 text-sm italic leading-relaxed text-slate-700">
          {OFFICIAL_SITE_OBSERVATION_DISCLAIMER.split(/\n\n+/).map(
            (paragraph) => (
              <p key={paragraph.slice(0, 48)}>{paragraph}</p>
            ),
          )}
        </div>
      </header>

      <div className="px-8 py-8 print:px-0">
        <section className="mb-10">
          <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
            Section A - Progress Summary
          </h2>
          {report.progressItems.length === 0 ? (
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
              <p>{report.siteVisitSummary}</p>
              {report.scope.trim() ? <p>{report.scope}</p> : null}
              <p>No specific progress observations were recorded for this visit.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {report.progressItems.map((item, index) => (
                <ProgressItem key={item.id} item={item} index={index} />
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
            Section B - Deficiencies Note on Completed Work
          </h2>
          {report.deficiencyItems.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              No deficiencies on completed work were noted during this site visit.
            </p>
          ) : (
            <div className="mt-6 space-y-8">
              {deficiencyGroups.map((group, index) => (
                <DeficiencyGroup
                  key={group.discipline}
                  disciplineIndex={index + 1}
                  disciplineLabel={group.disciplineLabel}
                  items={group.items}
                />
              ))}
            </div>
          )}
        </section>

        {report.actionSummary.length > 0 && (
          <section className="mb-10">
            <h2 className="border-b border-slate-300 pb-2 text-lg font-bold text-slate-900">
              Action Register (Preview Supplement)
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50 text-left">
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Obs. No.
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Location
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Discipline
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Required Action
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.actionSummary.map((item) => (
                    <tr
                      key={item.displayNumber}
                      className="border-b border-slate-200 align-top"
                    >
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {item.displayNumber}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {item.location}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {DISCIPLINE_LABELS[item.discipline]}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {item.requiredAction}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {item.priority ? PRIORITY_LABELS[item.priority] : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mb-10 border-t border-slate-200 pt-8">
          <h2 className="text-sm font-bold text-slate-900">Distribution</h2>
          <p className="mt-2 text-sm text-slate-700">
            {OFFICIAL_DISTRIBUTION_COMPANY}
          </p>
          <ul className="mt-2 flex flex-wrap gap-4 text-sm text-slate-700">
            {OFFICIAL_DISTRIBUTION_RECIPIENTS.map((recipient) => (
              <li key={recipient}>[x] {recipient}</li>
            ))}
          </ul>
          {cover.distributionList?.trim() ? (
            <p className="mt-2 text-sm text-slate-600">
              Additional notes: {cover.distributionList}
            </p>
          ) : null}
          <p className="mt-4 text-sm text-slate-800">
            <span className="font-semibold">Prepared by:</span>{" "}
            {cover.preparedBy?.trim() || "—"}
          </p>
        </section>
      </div>

      <footer className="border-t border-slate-200 bg-slate-50 px-8 py-4 print:hidden">
        <p className="text-xs text-slate-600">
          Preview only — review and edit all wording before issuing a final
          report. Letterhead and official template formatting will be applied in
          a future release.
        </p>
      </footer>
    </div>
  );
}
