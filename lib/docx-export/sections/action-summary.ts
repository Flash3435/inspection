import { Paragraph, Table, TableRow } from "docx";
import {
  DISCIPLINE_LABELS,
  OBSERVATION_STATUS_LABELS,
  PRIORITY_LABELS,
} from "../../constants";
import type { SiteObservationReport } from "../../types";
import {
  bodyParagraph,
  sectionHeading,
  TABLE_WIDTH,
  tableBodyCell,
  tableHeaderCell,
} from "../helpers";

export function buildActionSummarySection(
  report: SiteObservationReport,
): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [
    sectionHeading("5.0 Summary of Required Actions"),
  ];

  if (report.actionSummary.length === 0) {
    blocks.push(
      bodyParagraph(
        "No deficiencies or follow-up action items were identified based on the observations recorded.",
      ),
    );
    return blocks;
  }

  const header = new TableRow({
    tableHeader: true,
    children: [
      "Observation No.",
      "Location",
      "Discipline",
      "Status",
      "Priority",
      "Recommended / Required Action",
    ].map((text) => tableHeaderCell(text)),
  });

  const dataRows = report.actionSummary.map(
    (item) =>
      new TableRow({
        children: [
          item.displayNumber,
          item.location,
          DISCIPLINE_LABELS[item.discipline],
          OBSERVATION_STATUS_LABELS[item.status],
          item.priority ? PRIORITY_LABELS[item.priority] : "—",
          item.requiredAction,
        ].map((text) => tableBodyCell(text)),
      }),
  );

  blocks.push(
    new Table({
      width: TABLE_WIDTH,
      rows: [header, ...dataRows],
    }),
  );

  return blocks;
}
