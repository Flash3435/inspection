"use client";

import Link from "next/link";
import { useState } from "react";

interface DemoChecklistProps {
  projectId: string;
  onAddObservation?: () => void;
}

const CHECKLIST_STEPS = [
  {
    id: "review",
    label: "Review sample observations",
    detail:
      "Browse progress items, deficiencies, and follow-ups with sample photos and notes.",
  },
  {
    id: "draft",
    label: "Generate a draft for one deficiency",
    detail:
      "Edit an observation without draft text and use Generate Observation Draft.",
  },
  {
    id: "report",
    label: "Preview the report",
    detail: "See how observations assemble into Section A and Section B.",
  },
  {
    id: "docx",
    label: "Download Word report",
    detail: "Export the same structured content as a Word document from the report preview.",
  },
  {
    id: "capture",
    label: "Try adding your own photo or voice note",
    detail: "Add field media to any observation to test capture on site.",
  },
] as const;

function storageKey(projectId: string): string {
  return `inspection-demo-checklist-dismissed-${projectId}`;
}

export function DemoChecklist({
  projectId,
  onAddObservation,
}: DemoChecklistProps) {
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(storageKey(projectId)) === "1",
  );

  function handleDismiss() {
    localStorage.setItem(storageKey(projectId), "1");
    setDismissed(true);
  }

  if (dismissed) {
    return null;
  }

  return (
    <aside className="mb-8 rounded-xl border border-sky-200 bg-sky-50 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-sky-950">Demo walkthrough</p>
          <p className="mt-1 text-xs text-sky-800">
            Sample project with fictional data — not a real client engagement.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 text-xs font-medium text-sky-700 transition-colors hover:text-sky-900"
        >
          Dismiss
        </button>
      </div>

      <ol className="mt-4 space-y-3">
        {CHECKLIST_STEPS.map((step, index) => (
          <li key={step.id} className="flex gap-3 text-sm text-sky-950">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-200 text-xs font-semibold text-sky-900">
              {index + 1}
            </span>
            <div>
              <p className="font-medium">{step.label}</p>
              <p className="mt-0.5 text-xs text-sky-800">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/projects/${projectId}/report`}
          className="inline-flex rounded-lg bg-sky-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-700"
        >
          Open Report Preview
        </Link>
        {onAddObservation ? (
          <button
            type="button"
            onClick={onAddObservation}
            className="inline-flex rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-900 transition-colors hover:bg-sky-100"
          >
            Add Observation
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs font-medium text-sky-700 hover:text-sky-900"
        >
          Hide checklist
        </button>
      </div>
    </aside>
  );
}
