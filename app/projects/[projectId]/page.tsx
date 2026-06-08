"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { DemoChecklist } from "@/components/DemoChecklist";
import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import { ObservationCard } from "@/components/ObservationCard";
import { ObservationForm } from "@/components/ObservationForm";
import { ProjectForm } from "@/components/ProjectForm";
import { useInspection } from "@/context/InspectionContext";
import { formatDate } from "@/lib/utils";
import type { ObservationInput } from "@/lib/types";

type ViewMode = "list" | "add" | "edit" | "editProject";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const {
    hydrated,
    getProject,
    getObservationsForProject,
    createObservation,
    updateObservation,
    deleteObservation,
    deleteProject,
  } = useInspection();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-48 rounded-xl bg-slate-200" />
        </div>
      </AppShell>
    );
  }

  const project = getProject(projectId);

  if (!project) {
    return (
      <AppShell>
        <EmptyState
          title="Project not found"
          description="This project may have been deleted or the link is invalid."
          action={
            <Link
              href="/"
              className="inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white"
            >
              Back to Dashboard
            </Link>
          }
        />
      </AppShell>
    );
  }

  const observations = getObservationsForProject(projectId);
  const editingObservation = observations.find((o) => o.id === editingId);

  function handleCreate(input: ObservationInput, observationId: string) {
    void createObservation(projectId, input, observationId).then(() => {
      setViewMode("list");
    });
  }

  function handleUpdate(input: ObservationInput) {
    if (!editingId) return;
    void updateObservation(editingId, input).then(() => {
      setEditingId(null);
      setViewMode("list");
    });
  }

  function handleDeleteObservation(id: string) {
    if (window.confirm("Delete this observation?")) {
      void deleteObservation(id);
      if (editingId === id) {
        setEditingId(null);
        setViewMode("list");
      }
    }
  }

  function handleDeleteProject() {
    if (
      window.confirm(
        "Delete this project and all its observations? This cannot be undone.",
      )
    ) {
      void deleteProject(projectId).then(() => {
        router.push("/");
      });
    }
  }

  return (
    <AppShell>
      <SyncStatusBanner />
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {project.name}
            </h1>
            {project.isSampleProject && (
              <span className="mt-2 inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-sky-800">
                Sample
              </span>
            )}
            <p className="mt-1 text-sm text-slate-500">{project.siteName}</p>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
              {project.projectNumber && (
                <div>
                  <span className="font-medium text-slate-400">Project No.: </span>
                  {project.projectNumber}
                </div>
              )}
              <div>
                <span className="font-medium text-slate-400">Client: </span>
                {project.clientName || "—"}
              </div>
              <div>
                <span className="font-medium text-slate-400">Prepared By: </span>
                {project.preparedBy || project.inspectorName || "—"}
              </div>
              <div>
                <span className="font-medium text-slate-400">Visit Date: </span>
                {formatDate(project.visitDate || project.inspectionDate)}
              </div>
            </dl>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${projectId}/report`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Open Report Preview
            </Link>
            {viewMode === "list" && (
              <>
                <button
                  type="button"
                  onClick={() => setViewMode("editProject")}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Edit Project Details
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("add")}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                >
                  Add Observation
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleDeleteProject}
              className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Delete Project
            </button>
          </div>
        </div>

        {project.description && (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
            {project.description}
          </p>
        )}
      </div>

      {project.isSampleProject && (
        <DemoChecklist
          projectId={projectId}
          onAddObservation={() => setViewMode("add")}
        />
      )}

      {viewMode === "editProject" && (
        <div className="mb-8 max-w-2xl">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Edit Project Details
          </h2>
          <ProjectForm
            initial={project}
            onSaved={() => setViewMode("list")}
            onCancel={() => setViewMode("list")}
            submitLabel="Save Project Details"
          />
        </div>
      )}

      {viewMode === "add" && (
        <div className="mb-8 max-w-3xl">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            New Observation
          </h2>
          <ObservationForm
            projectId={projectId}
            onSubmit={handleCreate}
            onCancel={() => setViewMode("list")}
          />
        </div>
      )}

      {viewMode === "edit" && editingObservation && (
        <div className="mb-8 max-w-3xl">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Edit Observation
          </h2>
          <ObservationForm
            projectId={projectId}
            initial={editingObservation}
            onSubmit={handleUpdate}
            onCancel={() => {
              setEditingId(null);
              setViewMode("list");
            }}
            submitLabel="Update Observation"
          />
        </div>
      )}

      {viewMode === "list" && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Observations
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({observations.length})
              </span>
            </h2>
          </div>

          {observations.length === 0 ? (
            <EmptyState
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                  />
                </svg>
              }
              title="No observations yet"
              description="Document findings as you walk the site. Add photos, voice notes, and field notes for each item."
              action={
                <button
                  type="button"
                  onClick={() => setViewMode("add")}
                  className="inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                >
                  Add First Observation
                </button>
              }
            />
          ) : (
            <div className="space-y-4">
              {observations.map((observation) => (
                <ObservationCard
                  key={observation.id}
                  observation={observation}
                  onEdit={() => {
                    setEditingId(observation.id);
                    setViewMode("edit");
                  }}
                  onDelete={() => handleDeleteObservation(observation.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
