import { AlignmentType, Paragraph, Table, TextRun } from "docx";
import type { SiteObservationReport } from "../../types";
import { formatDate } from "../../utils";
import {
  centeredTitle,
  COLOR_PLACEHOLDER,
  fourColumnMetadataRow,
  italicParagraph,
  labelParagraph,
  labelValueTableRow,
  spacer,
  TABLE_WIDTH,
} from "../helpers";

const COVER_LABEL_SIZE = 24;

export function buildCoverSection(_report: SiteObservationReport): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "[H.H. Angus Logo / Letterhead]",
          italics: true,
          color: COLOR_PLACEHOLDER,
          size: 18,
        }),
      ],
    }),
    centeredTitle("SITE OBSERVATION REPORT", COVER_LABEL_SIZE + 12),
    spacer(160),
  ];
}

export function buildCoverSectionGeneric(
  report: SiteObservationReport,
): Paragraph[] {
  const { cover } = report;
  return [
    centeredTitle(cover.templateLabel.toUpperCase(), COVER_LABEL_SIZE),
    centeredTitle(cover.reportTitle, 32),
    spacer(120),
  ];
}

export function buildTemplateMetadataTable(
  report: SiteObservationReport,
): Table {
  const { cover } = report;

  return new Table({
    width: TABLE_WIDTH,
    rows: [
      fourColumnMetadataRow(
        "Project",
        cover.projectName,
        "Project No",
        cover.projectNumber,
      ),
      fourColumnMetadataRow(
        "Location",
        cover.siteAddress ?? cover.siteName,
        "Report No",
        cover.reportNumber,
      ),
      fourColumnMetadataRow(
        "Contractor",
        cover.contractorName,
        "Date of Visit",
        cover.visitDate ? formatDate(cover.visitDate) : undefined,
      ),
      fourColumnMetadataRow(
        "Building Permit No",
        cover.buildingPermitNo,
        "Report Date",
        cover.reportDate ? formatDate(cover.reportDate) : undefined,
      ),
      fourColumnMetadataRow("Sheet", "1 OF 1", "", ""),
    ],
  });
}

export function buildTemplateCoverFields(
  report: SiteObservationReport,
): Paragraph[] {
  const { cover } = report;
  return [
    labelParagraph("Reason for Site Visit", cover.reasonForVisit),
    labelParagraph("Present", cover.peoplePresent),
    spacer(160),
  ];
}

export function buildOfficialDisclaimerSection(
  report: SiteObservationReport,
): Paragraph[] {
  return report.officialDisclaimer
    .split(/\n\n+/)
    .filter(Boolean)
    .map((paragraph) => italicParagraph(paragraph));
}

export function buildMetadataTable(
  report: SiteObservationReport,
): Table | Paragraph {
  const { cover } = report;
  const rows: [string, string | undefined][] = [
    ["Client", cover.clientName],
    ["Project", cover.projectName],
    ["Project No.", cover.projectNumber],
    ["Report No.", cover.reportNumber],
    ["Site / Facility", cover.siteName],
    ["Location", cover.siteAddress],
    ["Building Permit No.", cover.buildingPermitNo],
    ["Contractor", cover.contractorName],
    [
      "Date of Visit",
      cover.visitDate ? formatDate(cover.visitDate) : undefined,
    ],
    [
      "Report Date",
      cover.reportDate ? formatDate(cover.reportDate) : undefined,
    ],
    ["Reason for Site Visit", cover.reasonForVisit],
    ["Present", cover.peoplePresent],
    ["Prepared By", cover.preparedBy],
    ["Reviewed By", cover.reviewedBy],
    ["Weather Conditions", cover.weatherConditions],
    ["Distribution", cover.distributionList],
  ];

  const filtered = rows.filter(([, value]) => value?.trim());
  if (filtered.length === 0) {
    return new Paragraph({ text: "Project metadata not provided." });
  }

  return new Table({
    width: TABLE_WIDTH,
    rows: filtered.map(([label, value]) =>
      labelValueTableRow(label, value!.trim(), 34),
    ),
  });
}
