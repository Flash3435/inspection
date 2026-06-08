import {
  DEFAULT_LIMITATIONS,
  DISCIPLINE_LABELS,
  DISCIPLINE_ORDER,
  DISCIPLINE_PREFIX,
  OBSERVATION_STATUS_LABELS,
  OFFICIAL_SITE_OBSERVATION_DISCLAIMER,
  REPORT_TEMPLATE_LABEL,
  STATUS_ORDER,
} from "./constants";
import { getCompletedTranscriptTexts } from "./transcript-utils";
import type {
  Discipline,
  Observation,
  Project,
  ReportActionItem,
  ReportDisciplineGroup,
  ReportObservationEntry,
  ReportPhotoAppendixItem,
  SiteObservationReport,
} from "./types";
import { formatDate } from "./utils";

function getObservationReportText(observation: Observation): string {
  if (observation.draftText.trim()) return observation.draftText.trim();
  if (observation.note.trim()) return observation.note.trim();
  const transcripts = getCompletedTranscriptTexts(observation.transcripts);
  if (transcripts.length > 0) return transcripts.join(" ");
  return "No narrative provided for this observation.";
}

function sortObservations(observations: Observation[]): Observation[] {
  return [...observations].sort((a, b) => {
    const disciplineDiff =
      DISCIPLINE_ORDER.indexOf(a.discipline) -
      DISCIPLINE_ORDER.indexOf(b.discipline);
    if (disciplineDiff !== 0) return disciplineDiff;

    const statusDiff =
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;

    return a.title.localeCompare(b.title);
  });
}

export function generateDisplayNumber(
  observation: Observation,
  disciplineCounters: Map<Discipline, number>,
): string {
  if (observation.observationNumber?.trim()) {
    return observation.observationNumber.trim();
  }

  const prefix = DISCIPLINE_PREFIX[observation.discipline];
  const next = (disciplineCounters.get(observation.discipline) ?? 0) + 1;
  disciplineCounters.set(observation.discipline, next);
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function buildObservationEntries(
  observations: Observation[],
): {
  entries: ReportObservationEntry[];
  photoAppendix: ReportPhotoAppendixItem[];
} {
  const sorted = sortObservations(observations);
  const disciplineCounters = new Map<Discipline, number>();
  const photoAppendix: ReportPhotoAppendixItem[] = [];
  let photoCounter = 0;

  const entries = sorted.map((observation) => {
    const displayNumber = generateDisplayNumber(
      observation,
      disciplineCounters,
    );

    const photoReferences = observation.photoIds.map((photoId) => {
      photoCounter += 1;
      const reference = `Figure ${photoCounter}`;
      photoAppendix.push({
        reference,
        observationNumber: displayNumber,
        observationTitle: observation.title,
        caption: observation.title,
        mediaId: photoId,
        location: observation.location || undefined,
        discipline: observation.discipline,
        status: observation.status,
      });
      return reference;
    });

    return {
      id: observation.id,
      displayNumber,
      title: observation.title,
      location: observation.location || "Not specified",
      status: observation.status,
      discipline: observation.discipline,
      reportText: getObservationReportText(observation),
      recommendedAction: observation.recommendedAction?.trim() || undefined,
      contractorActionRequired: observation.contractorActionRequired,
      priority: observation.priority,
      photoReferences,
      photoIds: observation.photoIds,
    };
  });

  return { entries, photoAppendix };
}

function groupByDiscipline(
  entries: ReportObservationEntry[],
): ReportDisciplineGroup[] {
  return DISCIPLINE_ORDER.map((discipline) => ({
    discipline,
    disciplineLabel: DISCIPLINE_LABELS[discipline],
    items: entries.filter((entry) => entry.discipline === discipline),
  })).filter((group) => group.items.length > 0);
}

function buildActionSummary(
  entries: ReportObservationEntry[],
): ReportActionItem[] {
  return entries
    .filter(
      (entry) =>
        entry.status === "deficiency" ||
        entry.status === "follow-up" ||
        entry.contractorActionRequired,
    )
    .map((entry) => ({
      displayNumber: entry.displayNumber,
      location: entry.location,
      discipline: entry.discipline,
      requiredAction:
        entry.recommendedAction ||
        (entry.status === "deficiency"
          ? "Correct identified deficiency and provide documentation of completion."
          : entry.status === "follow-up"
            ? "Complete follow-up verification and confirm resolution."
            : "Contractor action required — see observation narrative."),
      priority: entry.priority,
      status: entry.status,
    }));
}

function buildIntroduction(project: Project, observationCount: number): string {
  const visitDate = project.visitDate || project.inspectionDate;
  const formattedDate = visitDate ? formatDate(visitDate) : "the scheduled visit date";

  return [
    `This Site Observation Report documents field observations recorded during a site visit to ${project.siteName}${project.siteAddress ? `, ${project.siteAddress}` : ""} on ${formattedDate}.`,
    observationCount > 0
      ? `${observationCount} observation(s) were recorded across applicable building systems and areas accessible during the visit.`
      : "No field observations were recorded during this visit.",
    "Observations, recommended actions, and supporting photographs are presented in the sections that follow.",
  ].join(" ");
}

function buildScope(project: Project): string {
  const parts = [
    `The purpose of this site observation was to document conditions observed at ${project.siteName} in accordance with the project scope.`,
  ];

  if (project.description.trim()) {
    parts.push(project.description.trim());
  } else {
    parts.push(
      "The visit included a walkthrough of accessible mechanical, electrical, plumbing, and related building systems areas as applicable to the project.",
    );
  }

  if (project.contractorPresent?.trim()) {
    parts.push(`Contractor representative(s) present: ${project.contractorPresent.trim()}.`);
  }

  return parts.join(" ");
}

function splitObservationsBySection(
  entries: ReportObservationEntry[],
): {
  progressItems: ReportObservationEntry[];
  deficiencyItems: ReportObservationEntry[];
} {
  const progressItems = entries.filter(
    (entry) =>
      entry.status === "progress" ||
      entry.status === "general" ||
      (entry.contractorActionRequired &&
        entry.status !== "deficiency" &&
        entry.status !== "follow-up"),
  );
  const deficiencyItems = entries.filter(
    (entry) => entry.status === "deficiency" || entry.status === "follow-up",
  );

  return { progressItems, deficiencyItems };
}

function resolveReportDate(project: Project, generatedAt: string): string {
  if (project.reportDate?.trim()) return project.reportDate.trim();
  return generatedAt.slice(0, 10);
}

function resolveLocation(project: Project): string | undefined {
  const address = project.siteAddress?.trim();
  const site = project.siteName.trim();
  if (address && site && !address.toLowerCase().includes(site.toLowerCase())) {
    return `${site}, ${address}`;
  }
  return address || site || undefined;
}

function buildSiteVisitSummary(
  project: Project,
  entries: ReportObservationEntry[],
): string {
  const deficiencyCount = entries.filter((e) => e.status === "deficiency").length;
  const followUpCount = entries.filter((e) => e.status === "follow-up").length;
  const progressCount = entries.filter((e) => e.status === "progress").length;
  const actionCount = entries.filter((e) => e.contractorActionRequired).length;

  const parts = [
    `A site visit was conducted${project.visitDate || project.inspectionDate ? ` on ${formatDate(project.visitDate || project.inspectionDate)}` : ""}.`,
  ];

  if (project.weatherConditions?.trim()) {
    parts.push(`Weather conditions: ${project.weatherConditions.trim()}.`);
  }

  parts.push(`${entries.length} observation(s) were documented.`);

  if (deficiencyCount > 0) {
    parts.push(`${deficiencyCount} deficiency(ies) requiring attention were identified.`);
  } else {
    parts.push("No deficiencies were identified during this visit.");
  }

  if (followUpCount > 0) {
    parts.push(`${followUpCount} item(s) were flagged for follow-up verification.`);
  }

  if (progressCount > 0) {
    parts.push(`${progressCount} progress item(s) were noted.`);
  }

  if (actionCount > 0) {
    parts.push(`${actionCount} observation(s) require contractor action.`);
  }

  return parts.join(" ");
}

export function buildSiteObservationReport(
  project: Project,
  observations: Observation[],
): SiteObservationReport {
  const generatedAt = new Date().toISOString();
  const { entries, photoAppendix } = buildObservationEntries(observations);
  const { progressItems, deficiencyItems } = splitObservationsBySection(entries);
  const observationsByDiscipline = groupByDiscipline(entries);
  const actionSummary = buildActionSummary(entries);

  const visitDate = project.visitDate || project.inspectionDate;
  const preparedBy = project.preparedBy || project.inspectorName;
  const reportDate = resolveReportDate(project, generatedAt);
  const reasonForVisit =
    project.reasonForVisit?.trim() ||
    (project.description.trim() ? project.description.trim() : undefined);

  const tableOfContents = [
    { number: "Cover", title: "Site Observation Report" },
    { number: "Section A", title: "Progress Summary" },
    { number: "Section B", title: "Deficiencies Note on Completed Work" },
    { number: "Distribution", title: "Report Distribution" },
  ];

  return {
    templateType: "site_observation_report",
    cover: {
      reportTitle: "SITE OBSERVATION REPORT",
      templateLabel: REPORT_TEMPLATE_LABEL,
      projectNumber: project.projectNumber,
      reportNumber: project.reportNumber,
      projectName: project.name,
      clientName: project.clientName,
      siteName: project.siteName,
      siteAddress: resolveLocation(project),
      buildingPermitNo: project.buildingPermitNo,
      contractorName: project.contractorName,
      preparedBy,
      reviewedBy: project.reviewedBy,
      visitDate,
      reportDate,
      reasonForVisit,
      weatherConditions: project.weatherConditions,
      peoplePresent: project.contractorPresent,
      distributionList: project.distributionList,
      generatedAt,
    },
    officialDisclaimer: OFFICIAL_SITE_OBSERVATION_DISCLAIMER,
    tableOfContents,
    introduction: buildIntroduction(project, entries.length),
    scope: buildScope(project),
    siteVisitSummary: buildSiteVisitSummary(project, entries),
    progressItems,
    deficiencyItems,
    observationsByDiscipline,
    actionSummary,
    limitations: DEFAULT_LIMITATIONS,
    photoAppendix,
  };
}

export function formatReportPhotoCaption(
  photo: ReportPhotoAppendixItem,
  detailed = false,
): string {
  const titlePart = photo.caption.trim() || photo.observationTitle;
  if (!detailed) {
    return `${photo.reference} — ${titlePart}`;
  }

  const locationPart = photo.location?.trim()
    ? ` | Location: ${photo.location.trim()}`
    : "";
  const metaPart =
    photo.discipline && photo.status
      ? ` | ${DISCIPLINE_LABELS[photo.discipline]} | ${OBSERVATION_STATUS_LABELS[photo.status]}`
      : "";

  return `${photo.reference}: ${photo.observationNumber} — ${titlePart}${locationPart}${metaPart}`;
}
