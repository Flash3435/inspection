import { Document, Packer, Paragraph, Table } from "docx";
import type { ExportPhotoData } from "../export-images";
import type { SiteObservationReport } from "../types";
import {
  buildTemplateFirstPageHeader,
  buildTemplateFooter,
  buildTemplateHeader,
  spacer,
} from "./helpers";
import {
  buildIntroSection,
  buildScopeSection,
  buildSiteVisitSummarySection,
  buildTocSection,
} from "./sections/body-sections";
import { buildActionSummarySection } from "./sections/action-summary";
import {
  buildCoverSection,
  buildCoverSectionGeneric,
  buildMetadataTable,
  buildOfficialDisclaimerSection,
  buildTemplateCoverFields,
  buildTemplateMetadataTable,
} from "./sections/cover";
import { buildLimitationsSection } from "./sections/limitations";
import { buildObservationSection } from "./sections/observations";
import { buildPhotoAppendixSection } from "./sections/photo-appendix";
import {
  buildDeficienciesSection,
  buildDistributionSection,
  buildProgressSummarySection,
} from "./sections/template-sections";
import {
  DEFAULT_DOCX_EXPORT_STYLE,
  type DocxExportOptions,
  type DocxExportStyle,
} from "./types";

function buildTemplateDocumentBody(
  report: SiteObservationReport,
  photos: Map<string, ExportPhotoData>,
): (Paragraph | Table)[] {
  return [
    ...buildCoverSection(report),
    buildTemplateMetadataTable(report),
    ...buildTemplateCoverFields(report),
    ...buildOfficialDisclaimerSection(report),
    spacer(240),
    ...buildProgressSummarySection(report, photos),
    ...buildDeficienciesSection(report, photos),
    ...buildDistributionSection(report),
  ];
}

const GENERIC_TABLE_OF_CONTENTS = [
  { number: "1.0", title: "Introduction" },
  { number: "2.0", title: "Scope of Site Observation" },
  { number: "3.0", title: "Site Visit Summary" },
  { number: "4.0", title: "Observations" },
  { number: "5.0", title: "Summary of Required Actions" },
  { number: "6.0", title: "Limitations" },
  { number: "Appendix A", title: "Site Photographs" },
];

function buildGenericDocumentBody(
  report: SiteObservationReport,
  photos: Map<string, ExportPhotoData>,
): (Paragraph | Table)[] {
  const metadata = buildMetadataTable(report);

  return [
    ...buildCoverSectionGeneric(report),
    metadata,
    spacer(240),
    ...buildTocSection(report, GENERIC_TABLE_OF_CONTENTS),
    ...buildIntroSection(report),
    ...buildScopeSection(report),
    ...buildSiteVisitSummarySection(report),
    ...buildObservationSection(report, "generic"),
    ...buildActionSummarySection(report),
    ...buildLimitationsSection(report),
    ...buildPhotoAppendixSection(report, photos),
  ];
}

export async function assembleDocument(
  report: SiteObservationReport,
  photos: Map<string, ExportPhotoData>,
  exportStyle: DocxExportStyle = DEFAULT_DOCX_EXPORT_STYLE,
): Promise<Document> {
  const isTemplate = exportStyle === "site_observation_template";
  const bodySections = isTemplate
    ? buildTemplateDocumentBody(report, photos)
    : buildGenericDocumentBody(report, photos);

  return new Document({
    sections: [
      {
        properties: {
          titlePage: isTemplate,
        },
        headers: isTemplate
          ? {
              first: buildTemplateFirstPageHeader(),
              default: buildTemplateHeader(report.cover.reportNumber),
            }
          : undefined,
        footers: isTemplate
          ? {
              first: buildTemplateFooter(),
              default: buildTemplateFooter(),
            }
          : undefined,
        children: bodySections,
      },
    ],
  });
}

export async function buildSiteObservationReportDocxBlob(
  report: SiteObservationReport,
  photos: Map<string, ExportPhotoData>,
  options: DocxExportOptions = {},
): Promise<Blob> {
  const exportStyle = options.exportStyle ?? DEFAULT_DOCX_EXPORT_STYLE;
  const doc = await assembleDocument(report, photos, exportStyle);
  return Packer.toBlob(doc);
}
