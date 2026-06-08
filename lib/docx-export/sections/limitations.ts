import { Paragraph } from "docx";
import type { SiteObservationReport } from "../../types";
import { bodyParagraph, sectionHeading } from "../helpers";

export function buildLimitationsSection(
  report: SiteObservationReport,
): Paragraph[] {
  const paragraphs = report.limitations.split(/\n\n+/).filter(Boolean);

  return [
    sectionHeading("6.0 Limitations"),
    ...paragraphs.map((text) => bodyParagraph(text)),
  ];
}
