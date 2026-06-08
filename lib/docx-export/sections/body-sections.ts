import { HeadingLevel, Paragraph } from "docx";
import type { SiteObservationReport } from "../../types";
import { bodyParagraph, sectionHeading } from "../helpers";

export function buildIntroSection(report: SiteObservationReport): Paragraph[] {
  return [
    sectionHeading("1.0 Introduction"),
    bodyParagraph(report.introduction),
  ];
}

export function buildScopeSection(report: SiteObservationReport): Paragraph[] {
  return [
    sectionHeading("2.0 Scope of Site Observation"),
    bodyParagraph(report.scope),
  ];
}

export function buildSiteVisitSummarySection(
  report: SiteObservationReport,
): Paragraph[] {
  return [
    sectionHeading("3.0 Site Visit Summary"),
    bodyParagraph(report.siteVisitSummary),
  ];
}

export function buildTocSection(
  report: SiteObservationReport,
  entries?: { number: string; title: string }[],
): Paragraph[] {
  const toc = entries ?? report.tableOfContents;
  return [
    new Paragraph({
      text: "Table of Contents",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
    }),
    ...toc.map((entry) =>
      bodyParagraph(`${entry.number}\t${entry.title}`),
    ),
  ];
}
