import { createSamplePlaceholderImageBlob } from "./sample-placeholder-image";
import { saveMediaItem } from "./media-storage";
import { uploadMediaItem } from "./supabase/media-repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import { createTranscriptEntry } from "./transcript-utils";
import type { Observation, Project, ProjectInput } from "./types";
import { generateId } from "./utils";

export const SAMPLE_PROJECT_BASE_NAME = "Sample Office Fit-Out HVAC Review";

export interface SamplePhotoSeed {
  photoId: string;
  observationId: string;
  projectId: string;
  label: string;
  filename: string;
}

export interface SampleSeedBundle {
  project: Project;
  observations: Observation[];
  photos: SamplePhotoSeed[];
}

export function findSampleProject(projects: Project[]): Project | undefined {
  return projects.find((project) => project.isSampleProject);
}

export function buildSampleSeedBundle(options?: {
  forceNew?: boolean;
  copySuffix?: string;
}): SampleSeedBundle {
  const projectId = generateId();
  const visitDate = "2026-03-15";
  const reportDate = "2026-03-18";

  const obsIds = {
    flexDuctProgress: generateId(),
    disconnectedDuct: generateId(),
    accessPanel: generateId(),
    condensateDrain: generateId(),
    sprinklerCoord: generateId(),
    ceilingAccess: generateId(),
  };

  const photoIds = {
    flexDuct: generateId(),
    disconnectedDuct: generateId(),
    accessPanel: generateId(),
    sprinkler: generateId(),
  };

  const nameSuffix = options?.copySuffix?.trim();
  const projectName = nameSuffix
    ? `${SAMPLE_PROJECT_BASE_NAME} (${nameSuffix})`
    : SAMPLE_PROJECT_BASE_NAME;

  const projectInput: ProjectInput = {
    name: projectName,
    siteName: "Riverside Business Centre — Building C",
    clientName: "Northgate Property Group (Sample)",
    inspectorName: "Alex Morgan",
    inspectionDate: visitDate,
    description:
      "Mechanical site observation related to HVAC distribution, access panels, condensate routing, and balancing readiness for a fictional office fit-out.",
    reportTemplate: "site_observation_report",
    projectNumber: "SAMPLE-2026-014",
    reportNumber: "1",
    siteAddress: "1200 Sample Street, Riverside, ON",
    buildingPermitNo: "BP-SAMPLE-2026-0088",
    contractorName: "Summit Mechanical Contractors (Sample)",
    preparedBy: "Alex Morgan & Jamie Lee",
    reviewedBy: "Jamie Lee",
    visitDate,
    reportDate,
    reasonForVisit: "Monthly mechanical review",
    weatherConditions: "Overcast, 8°C",
    contractorPresent: "Alex Morgan, Jamie Lee, Summit Mechanical site lead",
    distributionList: "Project file; Owner; Prime consultant; GC/CM",
    isSampleProject: true,
  };

  const now = new Date().toISOString();
  const project: Project = {
    ...projectInput,
    id: projectId,
    createdAt: now,
    updatedAt: now,
  };

  const observations: Observation[] = [
    {
      id: obsIds.flexDuctProgress,
      projectId,
      title: "Flexible duct routing above open ceiling area",
      location: "Level 2 — Open Office Zone, ceiling space",
      note:
        "Flex duct routed toward branch diffusers. Supports appeared generally aligned. Final connections and sealing still pending in several bays.",
      photoIds: [photoIds.flexDuct],
      audioIds: [],
      transcripts: {
        "sample-transcript-flex-1": createTranscriptEntry(
          "sample-transcript-flex-1",
          {
            status: "completed",
            text: "Flex looks routed toward the diffusers. A few tie-wraps still temporary. Sealing at boots not finished yet.",
          },
        ),
      },
      draftText:
        "Work in this area appeared to be in progress at the time of the site visit at Level 2 — Open Office Zone, ceiling space. Flexible duct was observed routed toward branch diffusers with several final connections and sealing details still outstanding.",
      status: "progress",
      discipline: "mechanical",
      contractorActionRequired: false,
      priority: "low",
      codeReferenceIds: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: obsIds.disconnectedDuct,
      projectId,
      title: "Disconnected flexible duct above ceiling",
      location: "Level 2 — Corridor C ceiling plenum",
      note:
        "A section of flexible duct appeared disconnected from the branch takeoff. No visible damage noted. Reconnection and support verification required before concealment.",
      photoIds: [photoIds.disconnectedDuct],
      audioIds: [],
      transcripts: {
        "sample-transcript-duct-1": createTranscriptEntry(
          "sample-transcript-duct-1",
          {
            status: "completed",
            text: "Found a flex drop that is not connected at the takeoff. Looks like it was left for later but ceiling close-up is approaching.",
          },
        ),
      },
      draftText: "",
      status: "deficiency",
      discipline: "mechanical",
      contractorActionRequired: true,
      priority: "high",
      recommendedAction:
        "Mechanical contractor shall reconnect and support the flexible duct and provide photographic confirmation prior to ceiling closure.",
      codeReferenceIds: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: obsIds.accessPanel,
      projectId,
      title: "Missing access panel for balancing damper",
      location: "Level 2 — Zone 2B supply branch",
      note:
        "Balancing damper location marked on drawing, but no access panel was observed in the finished ceiling layout at the expected position.",
      photoIds: [photoIds.accessPanel],
      audioIds: [],
      transcripts: {
        "sample-transcript-panel-1": createTranscriptEntry(
          "sample-transcript-panel-1",
          {
            status: "completed",
            text: "Could not find an access panel where the damper should be. Ceiling tiles are installed in that area.",
          },
        ),
      },
      draftText: "",
      status: "deficiency",
      discipline: "mechanical",
      contractorActionRequired: true,
      priority: "medium",
      codeReferenceIds: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: obsIds.condensateDrain,
      projectId,
      title: "Condensate drain routing to be confirmed",
      location: "Level 2 — Mechanical room adjacent to AHU-2",
      note:
        "Condensate piping was observed partially installed from the coil connection. Final routing to the approved drain point was not verified during this visit.",
      photoIds: [],
      audioIds: [],
      transcripts: {
        "sample-transcript-cond-1": createTranscriptEntry(
          "sample-transcript-cond-1",
          {
            status: "completed",
            text: "Drain line starts at the coil but I could not confirm where it terminates. May need follow-up before startup.",
          },
        ),
      },
      draftText:
        "Further review is recommended to confirm condensate drain routing from AHU-2 at Level 2 — Mechanical room adjacent to AHU-2. Final termination at the approved drain point was not verified during this visit.",
      status: "follow-up",
      discipline: "plumbing",
      contractorActionRequired: true,
      priority: "medium",
      recommendedAction:
        "Plumbing contractor should confirm complete condensate routing and advise when verification can be witnessed.",
      codeReferenceIds: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: obsIds.sprinklerCoord,
      projectId,
      title: "Sprinkler head coordination near ceiling bulkhead",
      location: "Level 2 — Conference wing bulkhead",
      note:
        "New ceiling bulkhead framing was observed near existing sprinkler locations. Coordination of sprinkler head placement relative to the bulkhead should be reviewed before ceiling finish.",
      photoIds: [photoIds.sprinkler],
      audioIds: [],
      transcripts: {
        "sample-transcript-spr-1": createTranscriptEntry(
          "sample-transcript-spr-1",
          {
            status: "completed",
            text: "Bulkhead framing may affect head spacing here. Needs coordination with fire protection before tiles go in.",
          },
        ),
      },
      draftText: "",
      status: "general",
      discipline: "fire_protection",
      contractorActionRequired: false,
      priority: "low",
      codeReferenceIds: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: obsIds.ceilingAccess,
      projectId,
      title: "Ceiling tile removal and access constraints",
      location: "Level 2 — Open office area",
      note:
        "Several ceiling tiles were removed for duct routing. Temporary protection of open ceiling areas appeared adequate, but restored access and labeling should be confirmed before turnover.",
      photoIds: [],
      audioIds: [],
      transcripts: {},
      draftText:
        "During the site visit, temporary ceiling tile removal for duct routing was observed at Level 2 — Open office area. Access constraints and restoration requirements should be reviewed with the contractor prior to final inspection.",
      status: "general",
      discipline: "general",
      contractorActionRequired: false,
      codeReferenceIds: [],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const photos: SamplePhotoSeed[] = [
    {
      photoId: photoIds.flexDuct,
      observationId: obsIds.flexDuctProgress,
      projectId,
      label: "Flexible Duct Routing — Level 2",
      filename: "sample-flex-duct-routing.png",
    },
    {
      photoId: photoIds.disconnectedDuct,
      observationId: obsIds.disconnectedDuct,
      projectId,
      label: "Disconnected Flexible Duct — Corridor C",
      filename: "sample-disconnected-flex-duct.png",
    },
    {
      photoId: photoIds.accessPanel,
      observationId: obsIds.accessPanel,
      projectId,
      label: "Missing Access Panel — Zone 2B",
      filename: "sample-missing-access-panel.png",
    },
    {
      photoId: photoIds.sprinkler,
      observationId: obsIds.sprinklerCoord,
      projectId,
      label: "Sprinkler Coordination — Bulkhead",
      filename: "sample-sprinkler-coordination.png",
    },
  ];

  return { project, observations, photos };
}

export async function seedSamplePhotos(photos: SamplePhotoSeed[]): Promise<void> {
  for (const photo of photos) {
    const blob = await createSamplePlaceholderImageBlob(photo.label);
    await saveMediaItem(
      {
        observationId: photo.observationId,
        projectId: photo.projectId,
        type: "photo",
        file: blob,
        filename: photo.filename,
      },
      photo.photoId,
    );
  }
}

export async function seedSamplePhotosToCloud(
  client: SupabaseClient<Database>,
  userId: string,
  photos: SamplePhotoSeed[],
): Promise<void> {
  for (const photo of photos) {
    const blob = await createSamplePlaceholderImageBlob(photo.label);
    await uploadMediaItem(
      client,
      userId,
      {
        observationId: photo.observationId,
        projectId: photo.projectId,
        type: "photo",
        file: blob,
        filename: photo.filename,
      },
      photo.photoId,
    );
  }
}
