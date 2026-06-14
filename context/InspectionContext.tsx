"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth, useSupabase } from "@/context/AuthContext";
import {
  deleteMediaForObservation,
  deleteMediaForProject,
  deleteMediaItems,
} from "@/lib/media-service";
import {
  deleteObservationFromDb,
  deleteProjectFromDb,
  fetchAllObservations,
  fetchAllProjects,
  getObservationById,
  insertObservation,
  insertProject,
  updateObservationInDb,
  updateObservationTranscriptsInDb,
  updateProjectInDb,
} from "@/lib/supabase/repository";
import {
  buildSampleSeedBundle,
  findSampleProject as findSampleProjectInList,
  seedSamplePhotosToCloud,
} from "@/lib/sample-project";
import { transcribeAudio } from "@/lib/transcription";
import {
  createTranscriptEntry,
  pruneTranscripts,
  serializeTranscriptEntry,
} from "@/lib/transcript-utils";
import { logTranscribe, logTranscribeError } from "@/lib/media-diagnostics";
import {
  resolveAudioForTranscription,
} from "@/lib/media-service";
import {
  TranscriptionError,
  transcriptionErrorMessage,
  TRANSCRIPTION_USER_MESSAGES,
  mapTranscriptDbError,
} from "@/lib/transcription-errors";
import type {
  AudioTranscript,
  Observation,
  ObservationInput,
  Project,
  ProjectInput,
} from "@/lib/types";

export type SyncStatus = "idle" | "loading" | "saving" | "error";

interface InspectionContextValue {
  hydrated: boolean;
  isCloudMode: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  projects: Project[];
  observations: Observation[];
  createProject: (input: ProjectInput) => Promise<Project>;
  updateProject: (
    id: string,
    input: Partial<ProjectInput>,
  ) => Promise<Project | undefined>;
  getProject: (id: string) => Project | undefined;
  getObservation: (id: string) => Observation | undefined;
  getObservationsForProject: (projectId: string) => Observation[];
  createObservation: (
    projectId: string,
    input: ObservationInput,
    observationId?: string,
  ) => Promise<Observation>;
  updateObservation: (
    id: string,
    input: Partial<ObservationInput>,
  ) => Promise<Observation | undefined>;
  deleteObservation: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  transcribeObservationAudio: (
    projectId: string,
    observationId: string,
    audioId: string,
  ) => Promise<void>;
  updateObservationTranscript: (
    projectId: string,
    observationId: string,
    audioId: string,
    text: string,
  ) => Promise<void>;
  clearObservationTranscript: (
    projectId: string,
    observationId: string,
    audioId: string,
  ) => Promise<void>;
  findSampleProject: () => Project | undefined;
  seedSampleProject: (options?: { forceNew?: boolean }) => Promise<Project>;
  refreshData: () => Promise<void>;
  ensureDraftObservation: (
    projectId: string,
    observationId: string,
  ) => Promise<Observation>;
  patchObservationMediaIds: (
    observationId: string,
    photoIds: string[],
    audioIds: string[],
  ) => void;
  mediaOptions: { userId: string | null; client: ReturnType<typeof useSupabase> | null };
}

const InspectionContext = createContext<InspectionContextValue | null>(null);

function getRemovedIds(previous: string[], next: string[]): string[] {
  const nextSet = new Set(next);
  return previous.filter((id) => !nextSet.has(id));
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

function transcriptionKey(observationId: string, audioId: string): string {
  return `${observationId}:${audioId}`;
}

function formatSyncError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.toLowerCase().includes("jwt")) {
      return "Your session has expired. Please sign in again.";
    }
    if (
      err.message.toLowerCase().includes("network") ||
      err.message.toLowerCase().includes("fetch")
    ) {
      return "Network error. Check your connection and try again.";
    }
    return err.message;
  }
  return "Something went wrong while syncing.";
}

export function InspectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const supabase = useSupabase();

  const [projects, setProjects] = useState<Project[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const transcribingRef = useRef(new Set<string>());
  const observationsRef = useRef(observations);

  useEffect(() => {
    observationsRef.current = observations;
  }, [observations]);

  const isCloudMode = Boolean(user);
  const mediaOptions = useMemo(
    () => ({ userId: user?.id ?? null, client: user ? supabase : null }),
    [user, supabase],
  );

  const refreshData = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setObservations([]);
      setSyncStatus("idle");
      setSyncError(null);
      return;
    }

    setSyncStatus("loading");
    setSyncError(null);

    try {
      const [loadedProjects, loadedObservations] = await Promise.all([
        fetchAllProjects(supabase),
        fetchAllObservations(supabase),
      ]);
      setProjects(loadedProjects);
      setObservations(loadedObservations);
      setSyncStatus("idle");
    } catch (err) {
      setSyncStatus("error");
      setSyncError(formatSyncError(err));
    }
  }, [user, supabase]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function load() {
      if (!user) {
        if (!cancelled) {
          setProjects([]);
          setObservations([]);
          setHydrated(true);
          setSyncStatus("idle");
          setSyncError(null);
        }
        return;
      }

      setSyncStatus("loading");
      try {
        const [loadedProjects, loadedObservations] = await Promise.all([
          fetchAllProjects(supabase),
          fetchAllObservations(supabase),
        ]);
        if (!cancelled) {
          setProjects(loadedProjects);
          setObservations(loadedObservations);
          setSyncStatus("idle");
          setSyncError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSyncStatus("error");
          setSyncError(formatSyncError(err));
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, supabase]);

  const getObservation = useCallback(
    (id: string) => observations.find((o) => o.id === id),
    [observations],
  );

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects],
  );

  const getObservationsForProject = useCallback(
    (projectId: string) =>
      observations
        .filter((o) => o.projectId === projectId)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [observations],
  );

  const createProject = useCallback(
    async (input: ProjectInput): Promise<Project> => {
      if (!user) {
        throw new Error("Sign in to create a cloud project.");
      }

      setSyncStatus("saving");
      setSyncError(null);

      try {
        const project = await insertProject(supabase, user.id, input);
        setProjects((prev) => [project, ...prev]);
        setSyncStatus("idle");
        return project;
      } catch (err) {
        setSyncStatus("error");
        setSyncError(formatSyncError(err));
        throw err;
      }
    },
    [user, supabase],
  );

  const updateProject = useCallback(
    async (
      id: string,
      input: Partial<ProjectInput>,
    ): Promise<Project | undefined> => {
      if (!user) return undefined;

      setSyncStatus("saving");
      setSyncError(null);

      try {
        const updated = await updateProjectInDb(supabase, id, input);
        setProjects((prev) =>
          prev.map((project) => (project.id === id ? updated : project)),
        );
        setSyncStatus("idle");
        return updated;
      } catch (err) {
        setSyncStatus("error");
        setSyncError(formatSyncError(err));
        throw err;
      }
    },
    [user, supabase],
  );

  const createObservation = useCallback(
    async (
      projectId: string,
      input: ObservationInput,
      observationId?: string,
    ): Promise<Observation> => {
      if (!user) {
        throw new Error("Sign in to save observations.");
      }

      setSyncStatus("saving");
      setSyncError(null);

      try {
        const observation = await insertObservation(
          supabase,
          user.id,
          projectId,
          input,
          observationId,
        );
        setObservations((prev) => [observation, ...prev]);
        setSyncStatus("idle");
        return observation;
      } catch (err) {
        setSyncStatus("error");
        setSyncError(formatSyncError(err));
        throw err;
      }
    },
    [user, supabase],
  );

  const ensureDraftObservation = useCallback(
    async (projectId: string, observationId: string): Promise<Observation> => {
      const existing = observationsRef.current.find(
        (obs) => obs.id === observationId,
      );
      if (existing) {
        logTranscribe("draft:already_in_context", {
          projectId,
          observationId,
        });
        return existing;
      }

      if (!user) {
        throw new Error("Sign in to add observations.");
      }

      logTranscribe("draft:create_start", { projectId, observationId });

      const observation = await insertObservation(
        supabase,
        user.id,
        projectId,
        {
          title: "Draft",
          location: "",
          note: "",
          photoIds: [],
          audioIds: [],
          transcripts: {},
          status: "general",
          discipline: "general",
          contractorActionRequired: false,
          codeReferenceIds: [],
        },
        observationId,
      );

      setObservations((prev) => {
        if (prev.some((obs) => obs.id === observationId)) return prev;
        return [observation, ...prev];
      });

      logTranscribe("draft:create_success", {
        projectId,
        observationId: observation.id,
      });

      return observation;
    },
    [user, supabase],
  );

  const ensureObservationInContext = useCallback(
    async (projectId: string, observationId: string): Promise<Observation> => {
      const cached = observationsRef.current.find(
        (obs) => obs.id === observationId && obs.projectId === projectId,
      );
      if (cached) {
        logTranscribe("ensure_observation:context_hit", {
          projectId,
          observationId,
        });
        return cached;
      }

      if (!user) {
        throw new TranscriptionError(
          "observation_missing",
          TRANSCRIPTION_USER_MESSAGES.observation_missing,
        );
      }

      logTranscribe("ensure_observation:fetch_start", {
        projectId,
        observationId,
      });

      const fetched = await getObservationById(
        supabase,
        projectId,
        observationId,
      );

      if (!fetched) {
        logTranscribeError("ensure_observation:not_in_db", {
          projectId,
          observationId,
        });
        throw new TranscriptionError(
          "observation_missing",
          TRANSCRIPTION_USER_MESSAGES.observation_missing,
        );
      }

      setObservations((prev) => {
        const index = prev.findIndex((obs) => obs.id === observationId);
        if (index >= 0) {
          return prev.map((obs) =>
            obs.id === observationId ? { ...obs, ...fetched } : obs,
          );
        }
        return [fetched, ...prev];
      });

      logTranscribe("ensure_observation:fetch_success", {
        projectId,
        observationId,
        audioCount: fetched.audioIds.length,
        photoCount: fetched.photoIds.length,
      });

      return fetched;
    },
    [user, supabase],
  );

  const updateObservation = useCallback(
    async (
      id: string,
      input: Partial<ObservationInput>,
    ): Promise<Observation | undefined> => {
      const existing = observations.find((obs) => obs.id === id);
      if (!existing || !user) return undefined;

      const nextPhotoIds = input.photoIds ?? existing.photoIds;
      const nextAudioIds = input.audioIds ?? existing.audioIds;
      const removedMediaIds = [
        ...getRemovedIds(existing.photoIds, nextPhotoIds),
        ...getRemovedIds(existing.audioIds, nextAudioIds),
      ];

      setSyncStatus("saving");
      setSyncError(null);

      try {
        if (removedMediaIds.length > 0) {
          await deleteMediaItems(removedMediaIds, mediaOptions);
        }

        const mergedTranscripts = input.transcripts ?? existing.transcripts;
        const nextTranscripts = pruneTranscripts(mergedTranscripts, nextAudioIds);

        const updated = await updateObservationInDb(supabase, id, {
          ...input,
          transcripts: nextTranscripts,
        });

        const withMedia: Observation = {
          ...updated,
          photoIds: nextPhotoIds,
          audioIds: nextAudioIds,
          transcripts: nextTranscripts,
        };

        setObservations((prev) =>
          prev.map((obs) => (obs.id === id ? withMedia : obs)),
        );
        setSyncStatus("idle");
        return withMedia;
      } catch (err) {
        setSyncStatus("error");
        setSyncError(formatSyncError(err));
        throw err;
      }
    },
    [observations, user, supabase, mediaOptions],
  );

  const deleteObservation = useCallback(
    async (id: string) => {
      if (!user) return;

      setSyncStatus("saving");
      setSyncError(null);

      try {
        await deleteMediaForObservation(id, mediaOptions);
        await deleteObservationFromDb(supabase, id);
        setObservations((prev) => prev.filter((o) => o.id !== id));
        setSyncStatus("idle");
      } catch (err) {
        setSyncStatus("error");
        setSyncError(formatSyncError(err));
        throw err;
      }
    },
    [user, supabase, mediaOptions],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      if (!user) return;

      setSyncStatus("saving");
      setSyncError(null);

      try {
        await deleteMediaForProject(id, mediaOptions);
        await deleteProjectFromDb(supabase, id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setObservations((prev) => prev.filter((o) => o.projectId !== id));
        setSyncStatus("idle");
      } catch (err) {
        setSyncStatus("error");
        setSyncError(formatSyncError(err));
        throw err;
      }
    },
    [user, supabase, mediaOptions],
  );

  const patchObservationMediaIds = useCallback(
    (observationId: string, photoIds: string[], audioIds: string[]) => {
      setObservations((prev) =>
        prev.map((obs) => {
          if (obs.id !== observationId) return obs;
          if (
            arraysEqual(obs.photoIds, photoIds) &&
            arraysEqual(obs.audioIds, audioIds)
          ) {
            return obs;
          }
          return {
            ...obs,
            photoIds,
            audioIds,
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [],
  );

  const persistTranscripts = useCallback(
    async (
      projectId: string,
      observationId: string,
      transcripts: Record<string, AudioTranscript>,
    ) => {
      const now = new Date().toISOString();
      setObservations((prev) =>
        prev.map((obs) => {
          if (obs.id !== observationId || obs.projectId !== projectId) {
            return obs;
          }
          return { ...obs, transcripts, updatedAt: now };
        }),
      );

      if (user) {
        await updateObservationTranscriptsInDb(
          supabase,
          observationId,
          transcripts,
        );
      }
    },
    [user, supabase],
  );

  const setTranscript = useCallback(
    async (
      projectId: string,
      observationId: string,
      audioId: string,
      patch: Partial<AudioTranscript>,
    ) => {
      const ensured = await ensureObservationInContext(projectId, observationId);
      const now = new Date().toISOString();

      const currentObservation =
        observationsRef.current.find(
          (obs) => obs.id === observationId && obs.projectId === projectId,
        ) ?? ensured;

      logTranscribe("set_transcript:start", {
        projectId,
        observationId,
        audioId,
        userId: user?.id,
        observationLoaded: Boolean(currentObservation),
        currentTranscriptCount: Object.keys(currentObservation.transcripts).length,
        patchStatus: patch.status,
        patchTextLength: patch.text?.length ?? 0,
      });

      const existing = currentObservation.transcripts[audioId];
      const next = serializeTranscriptEntry(
        {
          ...(existing ?? createTranscriptEntry(audioId)),
          ...patch,
          audioId,
          updatedAt: now,
        },
        { clearError: patch.error === undefined },
      );

      const mergedTranscripts = {
        ...currentObservation.transcripts,
        [audioId]: next,
      };

      setObservations((prev) => {
        const hasObservation = prev.some(
          (obs) => obs.id === observationId && obs.projectId === projectId,
        );

        if (!hasObservation) {
          return [
            {
              ...currentObservation,
              transcripts: mergedTranscripts,
              updatedAt: now,
            },
            ...prev,
          ];
        }

        return prev.map((obs) =>
          obs.id === observationId && obs.projectId === projectId
            ? { ...obs, transcripts: mergedTranscripts, updatedAt: now }
            : obs,
        );
      });

      if (user) {
        try {
          const persisted = await updateObservationTranscriptsInDb(
            supabase,
            observationId,
            mergedTranscripts,
            {
              userId: user.id,
              projectId,
              audioId,
            },
          );

          setObservations((prev) =>
            prev.map((obs) =>
              obs.id === observationId && obs.projectId === projectId
                ? { ...obs, transcripts: persisted, updatedAt: now }
                : obs,
            ),
          );

          logTranscribe("set_transcript:success", {
            projectId,
            observationId,
            audioId,
            status: next.status,
            textLength: next.text.length,
          });
        } catch (err) {
          logTranscribeError(
            "set_transcript:db_failed",
            {
              projectId,
              observationId,
              audioId,
              userId: user.id,
            },
            err,
          );
          throw mapTranscriptDbError(err);
        }
      }
    },
    [user, supabase, ensureObservationInContext],
  );

  const transcribeObservationAudio = useCallback(
    async (
      projectId: string,
      observationId: string,
      audioId: string,
    ): Promise<void> => {
      const inContext = observationsRef.current.some(
        (obs) => obs.id === observationId && obs.projectId === projectId,
      );

      logTranscribe("context:start", {
        projectId,
        formObservationId: observationId,
        audioId,
        inContext,
        contextObservationCount: observationsRef.current.length,
      });

      const resolved = await resolveAudioForTranscription(
        audioId,
        mediaOptions,
        { projectId, observationId },
      );

      if (!resolved) {
        logTranscribeError("context:audio_not_found", {
          projectId,
          observationId,
          audioId,
        });
        throw new TranscriptionError(
          "audio_not_found",
          TRANSCRIPTION_USER_MESSAGES.audio_not_found,
        );
      }

      logTranscribe("context:media_resolved", {
        audioId,
        mediaObservationId: resolved.mediaObservationId,
        mediaProjectId: resolved.projectId,
        formObservationId: observationId,
        observationExistsInDb: resolved.observationExistsInDb,
        belongsToExpectedObservation: resolved.belongsToExpectedObservation,
      });

      if (resolved.projectId !== projectId) {
        throw new TranscriptionError(
          "audio_not_linked",
          TRANSCRIPTION_USER_MESSAGES.audio_not_linked,
        );
      }

      const targetObservationId = resolved.observationId;

      if (observationId !== targetObservationId) {
        logTranscribe("context:observation_id_mismatch", {
          formObservationId: observationId,
          mediaObservationId: targetObservationId,
          audioId,
        });
      }

      if (!resolved.observationExistsInDb) {
        throw new TranscriptionError(
          "observation_orphaned",
          TRANSCRIPTION_USER_MESSAGES.observation_orphaned,
        );
      }

      const ensuredObservation = await ensureObservationInContext(
        projectId,
        targetObservationId,
      );

      if (!ensuredObservation.audioIds.includes(audioId)) {
        patchObservationMediaIds(
          targetObservationId,
          ensuredObservation.photoIds,
          [...ensuredObservation.audioIds, audioId],
        );
      }

      const key = transcriptionKey(targetObservationId, audioId);
      if (transcribingRef.current.has(key)) {
        logTranscribe("context:skip_in_flight", {
          audioId,
          observationId: targetObservationId,
        });
        return;
      }

      const current = ensuredObservation.transcripts[audioId];
      if (current?.status === "transcribing") {
        logTranscribe("context:skip_already_transcribing", {
          audioId,
          observationId: targetObservationId,
        });
        return;
      }

      if (current?.status === "completed" && current.text?.trim()) {
        logTranscribe("context:skip_completed", {
          audioId,
          observationId: targetObservationId,
        });
        return;
      }

      transcribingRef.current.add(key);
      logTranscribe("context:status_before", {
        audioId,
        observationId: targetObservationId,
        status: current?.status ?? "none",
      });

      try {
        await setTranscript(projectId, targetObservationId, audioId, {
          status: "transcribing",
          error: undefined,
        });

        const text = await transcribeAudio(audioId, mediaOptions);
        await setTranscript(projectId, targetObservationId, audioId, {
          status: "completed",
          text,
          error: undefined,
        });
        logTranscribe("context:success", {
          audioId,
          observationId: targetObservationId,
          textLength: text.length,
        });
      } catch (err) {
        const message = transcriptionErrorMessage(err);
        try {
          await setTranscript(projectId, targetObservationId, audioId, {
            status: "failed",
            error: message,
          });
        } catch (saveErr) {
          logTranscribeError(
            "context:failed_status_save",
            { audioId, observationId: targetObservationId },
            saveErr,
          );
        }
        logTranscribeError(
          "context:failed",
          { audioId, observationId: targetObservationId },
          err,
        );
        throw err instanceof TranscriptionError
          ? err
          : new TranscriptionError("generic", message);
      } finally {
        transcribingRef.current.delete(key);
      }
    },
    [
      mediaOptions,
      ensureObservationInContext,
      patchObservationMediaIds,
      setTranscript,
    ],
  );

  const updateObservationTranscript = useCallback(
    async (
      projectId: string,
      observationId: string,
      audioId: string,
      text: string,
    ) => {
      await setTranscript(projectId, observationId, audioId, {
        status: "completed",
        text,
        error: undefined,
      });
    },
    [setTranscript],
  );

  const clearObservationTranscript = useCallback(
    async (projectId: string, observationId: string, audioId: string) => {
      const observation = observations.find((o) => o.id === observationId);
      if (!observation) return;

      const rest = { ...observation.transcripts };
      delete rest[audioId];
      await persistTranscripts(projectId, observationId, rest);
    },
    [observations, persistTranscripts],
  );

  const findSampleProject = useCallback(
    () => findSampleProjectInList(projects),
    [projects],
  );

  const seedSampleProject = useCallback(
    async (options?: { forceNew?: boolean }): Promise<Project> => {
      if (!user) {
        throw new Error("Sign in to create the sample project in the cloud.");
      }

      setSyncStatus("saving");
      setSyncError(null);

      try {
        const bundle = buildSampleSeedBundle(
          options?.forceNew
            ? {
                forceNew: true,
                copySuffix: new Date()
                  .toISOString()
                  .slice(0, 16)
                  .replace("T", " "),
              }
            : undefined,
        );

        const project = await insertProject(
          supabase,
          user.id,
          {
            name: bundle.project.name,
            siteName: bundle.project.siteName,
            clientName: bundle.project.clientName,
            inspectorName: bundle.project.inspectorName,
            inspectionDate: bundle.project.inspectionDate,
            description: bundle.project.description,
            reportTemplate: bundle.project.reportTemplate,
            projectNumber: bundle.project.projectNumber,
            reportNumber: bundle.project.reportNumber,
            siteAddress: bundle.project.siteAddress,
            buildingPermitNo: bundle.project.buildingPermitNo,
            contractorName: bundle.project.contractorName,
            preparedBy: bundle.project.preparedBy,
            reviewedBy: bundle.project.reviewedBy,
            visitDate: bundle.project.visitDate,
            reportDate: bundle.project.reportDate,
            reasonForVisit: bundle.project.reasonForVisit,
            weatherConditions: bundle.project.weatherConditions,
            contractorPresent: bundle.project.contractorPresent,
            distributionList: bundle.project.distributionList,
            isSampleProject: true,
          },
          bundle.project.id,
        );

        const savedObservations: Observation[] = [];
        for (const observation of bundle.observations) {
          const saved = await insertObservation(
            supabase,
            user.id,
            project.id,
            {
              title: observation.title,
              location: observation.location,
              note: observation.note,
              photoIds: observation.photoIds,
              audioIds: observation.audioIds,
              transcripts: observation.transcripts,
              draftText: observation.draftText,
              draftWarnings: observation.draftWarnings,
              draftGeneratedAt: observation.draftGeneratedAt,
              draftSourceSummary: observation.draftSourceSummary,
              draftManuallyEdited: observation.draftManuallyEdited,
              status: observation.status,
              discipline: observation.discipline,
              observationNumber: observation.observationNumber,
              contractorActionRequired: observation.contractorActionRequired,
              priority: observation.priority,
              recommendedAction: observation.recommendedAction,
              codeReferenceIds: observation.codeReferenceIds,
            },
            observation.id,
          );
          savedObservations.push(saved);
        }

        await seedSamplePhotosToCloud(
          supabase,
          user.id,
          bundle.photos,
        );

        setProjects((prev) => [project, ...prev]);
        setObservations((prev) => [...savedObservations, ...prev]);
        setSyncStatus("idle");
        return project;
      } catch (err) {
        setSyncStatus("error");
        setSyncError(formatSyncError(err));
        throw err;
      }
    },
    [user, supabase],
  );

  const value = useMemo(
    () => ({
      hydrated: hydrated && !authLoading,
      isCloudMode,
      syncStatus,
      syncError,
      projects,
      observations,
      createProject,
      updateProject,
      getProject,
      getObservation,
      getObservationsForProject,
      createObservation,
      updateObservation,
      deleteObservation,
      deleteProject,
      transcribeObservationAudio,
      updateObservationTranscript,
      clearObservationTranscript,
      findSampleProject,
      seedSampleProject,
      refreshData,
      ensureDraftObservation,
      patchObservationMediaIds,
      mediaOptions,
    }),
    [
      hydrated,
      authLoading,
      isCloudMode,
      syncStatus,
      syncError,
      projects,
      observations,
      createProject,
      updateProject,
      getProject,
      getObservation,
      getObservationsForProject,
      createObservation,
      updateObservation,
      deleteObservation,
      deleteProject,
      transcribeObservationAudio,
      updateObservationTranscript,
      clearObservationTranscript,
      findSampleProject,
      seedSampleProject,
      refreshData,
      ensureDraftObservation,
      patchObservationMediaIds,
      mediaOptions,
    ],
  );

  return (
    <InspectionContext.Provider value={value}>
      {children}
    </InspectionContext.Provider>
  );
}

export function useInspection() {
  const context = useContext(InspectionContext);
  if (!context) {
    throw new Error("useInspection must be used within InspectionProvider");
  }
  return context;
}

export function useMediaOptions() {
  const { mediaOptions } = useInspection();
  return mediaOptions;
}
