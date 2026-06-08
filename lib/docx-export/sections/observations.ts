import { Paragraph, Table } from "docx";
import {
  DISCIPLINE_LABELS,
  OBSERVATION_STATUS_LABELS,
  PRIORITY_LABELS,
} from "../../constants";
import type {
  ReportObservationEntry,
  SiteObservationReport,
} from "../../types";
import {
  bodyParagraph,
  disciplineHeading,
  labelValueTableRow,
  sectionHeading,
  TABLE_WIDTH,
} from "../helpers";
import type { DocxExportStyle } from "../types";

function buildObservationBlockTemplate(
  item: ReportObservationEntry,
): Table {
  const rows: [string, string][] = [
    ["Observation No.", item.displayNumber],
    ["Observation", item.title],
    ["Location", item.location],
    ["Discipline", DISCIPLINE_LABELS[item.discipline]],
    ["Status", OBSERVATION_STATUS_LABELS[item.status]],
  ];

  if (item.priority) {
    rows.push(["Priority", PRIORITY_LABELS[item.priority]]);
  }

  rows.push([
    "Contractor Action Required",
    item.contractorActionRequired ? "Yes" : "No",
  ]);

  rows.push(["Description", item.reportText]);

  if (item.recommendedAction) {
    rows.push(["Required / Recommended Action", item.recommendedAction]);
  }

  if (item.photoReferences.length > 0) {
    rows.push([
      "Reference Photographs",
      `${item.photoReferences.join(", ")}`,
    ]);
  }

  return new Table({
    width: TABLE_WIDTH,
    rows: rows.map(([label, value]) => labelValueTableRow(label, value, 30)),
  });
}

function buildObservationBlockGeneric(
  item: ReportObservationEntry,
): Paragraph[] {
  return [
    bodyParagraph(`${item.displayNumber} — ${item.title}`),
    bodyParagraph(`Location: ${item.location}`),
    bodyParagraph(
      `Status: ${OBSERVATION_STATUS_LABELS[item.status]} | Discipline: ${DISCIPLINE_LABELS[item.discipline]}`,
    ),
    bodyParagraph(item.reportText),
    ...(item.recommendedAction
      ? [bodyParagraph(`Recommended Action: ${item.recommendedAction}`)]
      : []),
    ...(item.photoReferences.length > 0
      ? [
          bodyParagraph(
            `Reference Photographs: ${item.photoReferences.join(", ")} — see Appendix A`,
          ),
        ]
      : []),
  ];
}

export function buildObservationSection(
  report: SiteObservationReport,
  exportStyle: DocxExportStyle,
): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [
    sectionHeading("4.0 Observations"),
  ];

  if (report.observationsByDiscipline.length === 0) {
    blocks.push(
      bodyParagraph("No observations were recorded for this site visit."),
    );
    return blocks;
  }

  for (const group of report.observationsByDiscipline) {
    blocks.push(disciplineHeading(group.disciplineLabel));

    for (const item of group.items) {
      if (exportStyle === "site_observation_template") {
        blocks.push(buildObservationBlockTemplate(item));
        blocks.push(bodyParagraph(""));
      } else {
        blocks.push(...buildObservationBlockGeneric(item));
      }
    }
  }

  return blocks;
}
