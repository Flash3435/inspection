import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ProjectForm } from "@/components/ProjectForm";

export default function NewProjectPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          New Inspection Project
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Set up a project before heading to the site
        </p>
      </div>
      <div className="max-w-2xl">
        <ProjectForm />
      </div>
    </AppShell>
  );
}
