"use client";

import { useInspection } from "@/context/InspectionContext";
import { useAuth } from "@/context/AuthContext";

export function SyncStatusBanner() {
  const { user } = useAuth();
  const { syncStatus, syncError, refreshData } = useInspection();

  if (!user) return null;

  if (syncStatus === "loading") {
    return (
      <div
        className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
        role="status"
      >
        Loading your projects…
      </div>
    );
  }

  if (syncStatus === "saving") {
    return (
      <div
        className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
        role="status"
      >
        Saving changes…
      </div>
    );
  }

  if (syncStatus === "error" && syncError) {
    return (
      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        role="alert"
      >
        <span>{syncError}</span>
        <button
          type="button"
          onClick={() => void refreshData()}
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
