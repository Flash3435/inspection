import {
  AlignmentType,
  ImageRun,
  Paragraph,
  TextRun,
} from "docx";
import {
  OFFICIAL_DISTRIBUTION_COMPANY,
  OFFICIAL_DISTRIBUTION_RECIPIENTS,
  DISCIPLINE_LABELS,
} from "../../constants";
import type { ExportPhotoData } from "../../export-images";
import { formatReportPhotoCaption } from "../../report-utils";
import type { Discipline, ReportObservationEntry, SiteObservationReport } from "../../types";
import {
  bodyParagraph,
  disciplineHeading,
  FONT_SMALL,
  labelParagraph,
  numberedItemParagraph,
  sectionHeading,
  spacer,
  subNumberedItemParagraph,
} from "../helpers";

function buildInlineFigureBlocks(
  item: ReportObservationEntry,
  photos: Map<string, ExportPhotoData>,
): Paragraph[] {
  const blocks: Paragraph[] = [];

  for (const [index, photoId] of item.photoIds.entries()) {
    const reference = item.photoReferences[index];
    const appendixItem = {
      reference,
      observationNumber: item.displayNumber,
      observationTitle: item.title,
      caption: item.title,
      mediaId: photoId,
      location: item.location,
      discipline: item.discipline,
      status: item.status,
    };
    blocks.push(
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({
            text: formatReportPhotoCaption(appendixItem),
            bold: true,
            size: FONT_SMALL,
          }),
        ],
      }),
    );

    const imageData = photos.get(photoId);
    if (imageData) {
      blocks.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 160 },
          children: [
            new ImageRun({
              type: imageData.type,
              data: imageData.data,
              transformation: {
                width: imageData.width,
                height: imageData.height,
              },
            }),
          ],
        }),
      );
    }
  }

  return blocks;
}

function buildDeficiencyNarrative(item: ReportObservationEntry): string {
  const action = item.recommendedAction?.trim();
  const lead = `During the site observation, it was noted that ${item.reportText}`;
  if (action) {
    return `${lead} ${action}`;
  }
  if (item.contractorActionRequired) {
    return `${lead} Contractor shall confirm corrective action in writing.`;
  }
  return lead;
}

export function buildProgressSummarySection(
  report: SiteObservationReport,
  photos: Map<string, ExportPhotoData>,
): Paragraph[] {
  const blocks: Paragraph[] = [
    sectionHeading("Section A - Progress Summary"),
  ];

  if (report.progressItems.length === 0) {
    blocks.push(bodyParagraph(report.siteVisitSummary));
    if (report.scope.trim()) {
      blocks.push(bodyParagraph(report.scope));
    }
    blocks.push(
      bodyParagraph(
        "No specific progress observations were recorded for this visit.",
      ),
    );
    return blocks;
  }

  report.progressItems.forEach((item, index) => {
    const lead = `${item.title}${item.location !== "Not specified" ? ` (${item.location})` : ""}: ${item.reportText}`;
    blocks.push(numberedItemParagraph(index + 1, lead));
    blocks.push(...buildInlineFigureBlocks(item, photos));
  });

  return blocks;
}

export function buildDeficienciesSection(
  report: SiteObservationReport,
  photos: Map<string, ExportPhotoData>,
): Paragraph[] {
  const blocks: Paragraph[] = [
    sectionHeading("Section B - Deficiencies Note on Completed Work"),
  ];

  if (report.deficiencyItems.length === 0) {
    blocks.push(
      bodyParagraph(
        "No deficiencies on completed work were noted during this site visit.",
      ),
    );
    return blocks;
  }

  const byDiscipline = new Map<Discipline, ReportObservationEntry[]>();
  for (const item of report.deficiencyItems) {
    const group = byDiscipline.get(item.discipline) ?? [];
    group.push(item);
    byDiscipline.set(item.discipline, group);
  }

  let disciplineIndex = 0;
  for (const [discipline, items] of byDiscipline) {
    disciplineIndex += 1;
    blocks.push(
      disciplineHeading(
        `${disciplineIndex}. ${DISCIPLINE_LABELS[discipline]}`,
      ),
    );

    items.forEach((item, itemIndex) => {
      blocks.push(
        subNumberedItemParagraph(
          disciplineIndex,
          itemIndex + 1,
          buildDeficiencyNarrative(item),
        ),
      );
      blocks.push(...buildInlineFigureBlocks(item, photos));
    });
  }

  return blocks;
}

/**
 * TODO: Replace text checkmarks with Word content-control checkboxes from .dotx.
 */
export function buildDistributionSection(
  report: SiteObservationReport,
): Paragraph[] {
  const { cover } = report;
  const recipientLine = OFFICIAL_DISTRIBUTION_RECIPIENTS.map(
    (recipient) => `[x] ${recipient}`,
  ).join("    ");

  return [
    spacer(240),
    bodyParagraph(`Distribution: ${OFFICIAL_DISTRIBUTION_COMPANY}`),
    bodyParagraph(recipientLine),
    ...(cover.distributionList?.trim()
      ? [bodyParagraph(`Additional distribution notes: ${cover.distributionList.trim()}`)]
      : []),
    labelParagraph("Prepared by", cover.preparedBy),
  ];
}
