export type DocxExportStyle = "generic" | "site_observation_template";

export interface DocxExportOptions {
  exportStyle?: DocxExportStyle;
}

export const DEFAULT_DOCX_EXPORT_STYLE: DocxExportStyle =
  "site_observation_template";
