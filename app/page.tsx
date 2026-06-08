"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { LocalDemoNotice } from "@/components/LocalDemoNotice";
import { ProjectCard } from "@/components/ProjectCard";
import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import { TrySampleProjectButton } from "@/components/TrySampleProjectButton";
import { useAuth } from "@/context/AuthContext";
import { useInspection } from "@/context/InspectionContext";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { hydrated, projects } = useInspection();

  if (!hydrated || authLoading) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="h-32 rounded-xl bg-slate-200" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <LocalDemoNotice />
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">
            InspectReport
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Capture field observations on your phone, sync them to the cloud,
            and generate Site Observation Reports from your laptop.
          </p>
        </div>
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
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          }
          title="Sign in to sync across devices"
          description="Create an account to save projects, observations, photos, and audio in the cloud. Your data stays private to your account."
          action={
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                Sign In
              </Link>
              <Link
                href="/login?mode=signup"
                className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Create Account
              </Link>
            </div>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SyncStatusBanner />
      <LocalDemoNotice />

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Inspection Projects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Capture field observations, draft report wording, and export Site
            Observation Reports
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {projects.length > 0 && (
            <TrySampleProjectButton label="Try Sample Project" />
          )}
          <Link
            href="/projects/new"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            {projects.length === 0 ? "Create New Project" : "New Project"}
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
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
                d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
              />
            </svg>
          }
          title="Start with a sample walkthrough"
          description="InspectReport helps you document site visits, turn field notes into report-ready observation text, and preview a Site Observation Report before export. Try the sample project to see the full workflow in a few minutes."
          action={
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <TrySampleProjectButton
                variant="primary"
                label="Try Sample Project"
              />
              <Link
                href="/projects/new"
                className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Create New Project
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
