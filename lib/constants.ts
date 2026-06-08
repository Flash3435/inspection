import type {
  Discipline,
  ObservationStatus,
  Priority,
} from "./types";

export const OBSERVATION_STATUS_LABELS: Record<ObservationStatus, string> = {
  general: "General Observation",
  deficiency: "Deficiency",
  "follow-up": "Follow-up Required",
  progress: "Progress Item",
};

export const OBSERVATION_STATUSES: ObservationStatus[] = [
  "general",
  "deficiency",
  "follow-up",
  "progress",
];

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  mechanical: "Mechanical",
  electrical: "Electrical",
  plumbing: "Plumbing",
  fire_protection: "Fire Protection",
  general: "General",
};

export const DISCIPLINES: Discipline[] = [
  "mechanical",
  "electrical",
  "plumbing",
  "fire_protection",
  "general",
];

export const DISCIPLINE_PREFIX: Record<Discipline, string> = {
  mechanical: "M",
  electrical: "E",
  plumbing: "P",
  fire_protection: "FP",
  general: "G",
};

export const DISCIPLINE_ORDER: Discipline[] = [
  "mechanical",
  "electrical",
  "plumbing",
  "fire_protection",
  "general",
];

export const STATUS_ORDER: ObservationStatus[] = [
  "deficiency",
  "follow-up",
  "progress",
  "general",
];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const PRIORITIES: Priority[] = ["low", "medium", "high"];

export const REPORT_TEMPLATE_LABEL = "Site Observation Report";

/** Controlled document procedure number from 6.12_Site Observation Report_(AO).dotx */
export const OFFICIAL_TEMPLATE_PROCEDURE_NO = "6.12";

export const OFFICIAL_DISTRIBUTION_COMPANY =
  "H.H. ANGUS AND ASSOCIATES LTD.";

export const OFFICIAL_DISTRIBUTION_RECIPIENTS = [
  "Project File",
  "Owner",
  "Prime Consultant",
  "GM/CM",
] as const;

/** Cover-page disclaimer from the official .dotx template (paraphrased structure). */
export const OFFICIAL_SITE_OBSERVATION_DISCLAIMER = [
  "The comments included in this site observation report describe only those items observed at the time of the visit and are not to be construed as a detailed evaluation of the progress of the work or the state of compliance with the Contract Documents. This report does not express any engineering opinion and therefore is not a general review report unless authenticated by the licensed review engineer. It is the responsibility of the contractor(s) to carry out their own inspection of the Work to determine compliance with the Contract Documents.",
  "The correction of any noted deficiencies must be confirmed in writing before a further review will be carried out.",
].join("\n\n");

export const STORAGE_KEY = "inspection-app-store";

export const DEFAULT_LIMITATIONS = [
  "This Site Observation Report documents conditions observed during the site visit identified on the cover page. The observations and conclusions presented herein are based on visual review of accessible areas and equipment at the time of the visit only.",
  "This report does not constitute a comprehensive audit, testing program, or code compliance review unless specifically identified in the project scope. Concealed conditions, latent defects, or issues not visible during the walkthrough are expressly excluded.",
  "Recommendations and required actions noted in this report are preliminary and subject to review by the project engineer of record. The client and contractor should confirm scope, schedule, and responsibility for corrective work.",
  "This document is prepared for the use of the client and parties identified in the distribution list. It may not be relied upon by third parties without written consent.",
].join("\n\n");
