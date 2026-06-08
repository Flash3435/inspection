import {
  AlignmentType,
  BorderStyle,
  Footer,
  Header,
  HeadingLevel,
  PageNumber,
  Paragraph,
  ShadingType,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

/** Word font size in half-points (22 = 11pt body). */
export const FONT_BODY = 22;
export const FONT_SMALL = 20;
export const FONT_TITLE = 36;
export const FONT_SUBTITLE = 28;

export const COLOR_LABEL_BG = "E8EBEF";
export const COLOR_PLACEHOLDER = "888888";

export const BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: "BBBBBB",
};

export const TABLE_WIDTH = { size: 100, type: WidthType.PERCENTAGE } as const;

export function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 140, line: 276 },
    children: [new TextRun({ text, size: FONT_BODY })],
  });
}

export function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
  });
}

export function disciplineHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: FONT_BODY,
        underline: {},
      }),
    ],
  });
}

export function spacer(after = 200): Paragraph {
  return new Paragraph({ text: "", spacing: { after } });
}

export function labelValueTableRow(
  label: string,
  value: string,
  labelWidth = 32,
): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: labelWidth, type: WidthType.PERCENTAGE },
        shading: { fill: COLOR_LABEL_BG, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 100 },
        borders: {
          top: BORDER,
          bottom: BORDER,
          left: BORDER,
          right: BORDER,
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: label, bold: true, size: FONT_SMALL }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 100 - labelWidth, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 140, right: 100 },
        borders: {
          top: BORDER,
          bottom: BORDER,
          left: BORDER,
          right: BORDER,
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: value, size: FONT_SMALL })],
          }),
        ],
      }),
    ],
  });
}

export function centeredTitle(text: string, size = FONT_TITLE): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({ text, bold: true, size })],
  });
}

export function centeredSubtitle(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text, size: FONT_SUBTITLE })],
  });
}

export function tableHeaderCell(text: string): TableCell {
  return new TableCell({
    shading: { fill: "1E293B", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: true, size: FONT_SMALL, color: "FFFFFF" }),
        ],
      }),
    ],
  });
}

export function italicParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 140, line: 276 },
    children: [new TextRun({ text, italics: true, size: FONT_BODY })],
  });
}

export function labelParagraph(label: string, value?: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: FONT_BODY }),
      new TextRun({
        text: value?.trim() || "Not provided",
        size: FONT_BODY,
      }),
    ],
  });
}

export function fourColumnMetadataRow(
  label1: string,
  value1: string | undefined,
  label2: string,
  value2: string | undefined,
): TableRow {
  return new TableRow({
    children: [
      metadataLabelCell(label1),
      metadataValueCell(value1),
      metadataLabelCell(label2),
      metadataValueCell(value2),
    ],
  });
}

function metadataLabelCell(label: string): TableCell {
  return new TableCell({
    width: { size: 18, type: WidthType.PERCENTAGE },
    shading: { fill: COLOR_LABEL_BG, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 120, right: 80 },
    borders: {
      top: BORDER,
      bottom: BORDER,
      left: BORDER,
      right: BORDER,
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: label, bold: true, size: FONT_SMALL }),
        ],
      }),
    ],
  });
}

function metadataValueCell(value: string | undefined): TableCell {
  return new TableCell({
    width: { size: 32, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 120, right: 80 },
    borders: {
      top: BORDER,
      bottom: BORDER,
      left: BORDER,
      right: BORDER,
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: value?.trim() || "—",
            size: FONT_SMALL,
          }),
        ],
      }),
    ],
  });
}

export function buildTemplateHeader(reportNumber?: string): Header {
  return new Header({
    children: [
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Site Observation Report", size: FONT_SMALL }),
          new TextRun({
            text: `  No. ${reportNumber?.trim() || "—"}`,
            size: FONT_SMALL,
          }),
        ],
      }),
    ],
  });
}

export function buildTemplateFirstPageHeader(): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: "[H.H. Angus Logo / Letterhead]",
            italics: true,
            color: COLOR_PLACEHOLDER,
            size: FONT_SMALL,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "1176 Eglinton Avenue East, Suite 800, Toronto, ON M3C 0S1",
            size: FONT_SMALL,
            color: COLOR_PLACEHOLDER,
          }),
        ],
      }),
    ],
  });
}

/** TODO: Replace placeholder footer with official logo/footer artwork from .dotx. */
export function buildTemplateFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Expanding What is Possible. Together. For a Better Future.",
            italics: true,
            size: 16,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "hhangus.com", size: 16 }),
          new TextRun({ text: "   ", size: 16 }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
        ],
      }),
    ],
  });
}

export function numberedItemParagraph(index: number, text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 140, line: 276 },
    children: [
      new TextRun({ text: `${index}. `, bold: true, size: FONT_BODY }),
      new TextRun({ text, size: FONT_BODY }),
    ],
  });
}

export function subNumberedItemParagraph(
  major: number,
  minor: number,
  text: string,
): Paragraph {
  return new Paragraph({
    spacing: { after: 140, line: 276 },
    children: [
      new TextRun({ text: `${major}.${minor} `, bold: true, size: FONT_BODY }),
      new TextRun({ text, size: FONT_BODY }),
    ],
  });
}

export function tableBodyCell(text: string): TableCell {
  return new TableCell({
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    borders: {
      top: BORDER,
      bottom: BORDER,
      left: BORDER,
      right: BORDER,
    },
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: FONT_SMALL })],
      }),
    ],
  });
}
