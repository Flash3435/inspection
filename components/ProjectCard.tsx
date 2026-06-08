import Link from "next/link";
import type { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useInspection } from "@/context/InspectionContext";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { getObservationsForProject } = useInspection();
  const observationCount = getObservationsForProject(project.id).length;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
    >
        <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-slate-700">
              {project.name}
            </h3>
            {project.isSampleProject && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                Sample
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{project.siteName}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {observationCount}{" "}
          {observationCount === 1 ? "observation" : "observations"}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
        <div>
          <dt className="font-medium text-slate-400">Client</dt>
          <dd className="mt-0.5 truncate text-slate-700">{project.clientName}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-400">Inspector</dt>
          <dd className="mt-0.5 truncate text-slate-700">
            {project.inspectorName}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="font-medium text-slate-400">Inspection Date</dt>
          <dd className="mt-0.5 text-slate-700">
            {formatDate(project.inspectionDate)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
