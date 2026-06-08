"use client";

import { hasLocalDemoData } from "@/lib/media-service";

export function LocalDemoNotice() {
  if (!hasLocalDemoData()) return null;

  return (
    <div
      className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      role="status"
    >
      Local demo projects are stored only in this browser. Sign in and create a
      cloud project to access your work from other devices.
    </div>
  );
}
