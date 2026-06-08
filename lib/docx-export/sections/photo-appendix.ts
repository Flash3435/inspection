import { AlignmentType, ImageRun, Paragraph, TextRun } from "docx";
import type { ExportPhotoData } from "../../export-images";
import { formatReportPhotoCaption } from "../../report-utils";
import type { SiteObservationReport } from "../../types";
import { bodyParagraph, FONT_SMALL, sectionHeading } from "../helpers";

/**
 * TODO: Evaluate inline photos under each observation if Ash's sample PDF
 * consistently places images in the body rather than appendix-only.
 * Appendix-first is retained for reliability and smaller file size.
 */
export function buildPhotoAppendixSection(
  report: SiteObservationReport,
  photos: Map<string, ExportPhotoData>,
): Paragraph[] {
  const blocks: Paragraph[] = [
    sectionHeading("Appendix A: Site Photographs"),
  ];

  if (report.photoAppendix.length === 0) {
    blocks.push(
      bodyParagraph(
        "No site photographs were attached to observations for this report.",
      ),
    );
    return blocks;
  }

  blocks.push(
    bodyParagraph(
      "Reference photographs supporting the observations in Section 4.0 are provided below.",
    ),
  );

  for (const photo of report.photoAppendix) {
    blocks.push(
      new Paragraph({
        spacing: { before: 240, after: 80 },
        children: [
          new TextRun({
            text: formatReportPhotoCaption(photo),
            bold: true,
            size: FONT_SMALL,
          }),
        ],
      }),
    );

    const imageData = photos.get(photo.mediaId);
    if (imageData) {
      blocks.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 200 },
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
    } else {
      blocks.push(
        bodyParagraph(
          "[Image could not be loaded for export. Refer to the digital project record.]",
        ),
      );
    }
  }

  return blocks;
}
