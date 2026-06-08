import type { ObservationStatus } from "@/lib/types";
import { OBSERVATION_STATUS_LABELS } from "@/lib/constants";

const STATUS_STYLES: Record<ObservationStatus, string> = {
  general: "bg-slate-100 text-slate-700 ring-slate-200",
  deficiency: "bg-red-50 text-red-700 ring-red-200",
  "follow-up": "bg-amber-50 text-amber-800 ring-amber-200",
  progress: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function StatusBadge({ status }: { status: ObservationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {OBSERVATION_STATUS_LABELS[status]}
    </span>
  );
}
