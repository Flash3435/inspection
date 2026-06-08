"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectInput } from "@/lib/types";
import { useInspection } from "@/context/InspectionContext";

function buildEmptyForm(): ProjectInput {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: "",
    siteName: "",
    clientName: "",
    inspectorName: "",
    inspectionDate: today,
    description: "",
    reportTemplate: "site_observation_report",
    projectNumber: "",
    reportNumber: "",
    siteAddress: "",
    buildingPermitNo: "",
    contractorName: "",
    preparedBy: "",
    reviewedBy: "",
    visitDate: today,
    reportDate: today,
    reasonForVisit: "",
    weatherConditions: "",
    contractorPresent: "",
    distributionList: "",
  };
}

function projectToForm(project: Project): ProjectInput {
  return {
    name: project.name,
    siteName: project.siteName,
    clientName: project.clientName,
    inspectorName: project.inspectorName,
    inspectionDate: project.inspectionDate,
    description: project.description,
    reportTemplate: project.reportTemplate,
    projectNumber: project.projectNumber ?? "",
    reportNumber: project.reportNumber ?? "",
    siteAddress: project.siteAddress ?? "",
    buildingPermitNo: project.buildingPermitNo ?? "",
    contractorName: project.contractorName ?? "",
    preparedBy: project.preparedBy ?? project.inspectorName,
    reviewedBy: project.reviewedBy ?? "",
    visitDate: project.visitDate ?? project.inspectionDate,
    reportDate: project.reportDate ?? "",
    reasonForVisit: project.reasonForVisit ?? "",
    weatherConditions: project.weatherConditions ?? "",
    contractorPresent: project.contractorPresent ?? "",
    distributionList: project.distributionList ?? "",
  };
}

interface ProjectFormProps {
  initial?: Project;
  onSaved?: (project: Project) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function ProjectForm({
  initial,
  onSaved,
  onCancel,
  submitLabel,
}: ProjectFormProps) {
  const router = useRouter();
  const { createProject, updateProject } = useInspection();
  const isEditing = Boolean(initial);

  const [form, setForm] = useState<ProjectInput>(() =>
    initial ? projectToForm(initial) : buildEmptyForm(),
  );
  const [showReportFields, setShowReportFields] = useState(isEditing);
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "inspectorName" && !prev.preparedBy) {
        next.preparedBy = value;
      }
      if (name === "inspectionDate" && !prev.visitDate) {
        next.visitDate = value;
      }
      return next;
    });
  }

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.siteName.trim()) {
      setError("Project name and site name are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (isEditing && initial) {
        const updated = await updateProject(initial.id, form);
        if (updated) onSaved?.(updated);
        return;
      }

      const project = await createProject(form);
      if (onSaved) {
        onSaved(project);
      } else {
        router.push(`/projects/${project.id}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save project.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  }

  const inputClass =
    "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Project Name *
          </label>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Downtown Office Tower — Q2 HVAC Inspection"
            className={inputClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="siteName" className="block text-sm font-medium text-slate-700">
              Site Name *
            </label>
            <input
              id="siteName"
              name="siteName"
              value={form.siteName}
              onChange={handleChange}
              placeholder="Building or facility name"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-slate-700">
              Client
            </label>
            <input
              id="clientName"
              name="clientName"
              value={form.clientName}
              onChange={handleChange}
              placeholder="Client organization"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="inspectorName" className="block text-sm font-medium text-slate-700">
              Inspector
            </label>
            <input
              id="inspectorName"
              name="inspectorName"
              value={form.inspectorName}
              onChange={handleChange}
              placeholder="Field inspector name"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="inspectionDate" className="block text-sm font-medium text-slate-700">
              Inspection Date
            </label>
            <input
              id="inspectionDate"
              name="inspectionDate"
              type="date"
              value={form.inspectionDate}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">
            Scope / Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            placeholder="Scope of site observation, systems to review, special instructions…"
            className={inputClass}
          />
        </div>

        <div className="border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={() => setShowReportFields((prev) => !prev)}
            className="flex w-full items-center justify-between text-sm font-medium text-slate-700"
          >
            Report Metadata
            <span className="text-xs text-slate-400">
              {showReportFields ? "Hide" : "Show"}
            </span>
          </button>

          {showReportFields && (
            <div className="mt-4 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="projectNumber" className="block text-sm font-medium text-slate-700">
                    Project Number
                  </label>
                  <input
                    id="projectNumber"
                    name="projectNumber"
                    value={form.projectNumber ?? ""}
                    onChange={handleChange}
                    placeholder="e.g. 2201319"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="reportNumber" className="block text-sm font-medium text-slate-700">
                    Report Number
                  </label>
                  <input
                    id="reportNumber"
                    name="reportNumber"
                    value={form.reportNumber ?? ""}
                    onChange={handleChange}
                    placeholder="e.g. 1"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="visitDate" className="block text-sm font-medium text-slate-700">
                    Date of Visit
                  </label>
                  <input
                    id="visitDate"
                    name="visitDate"
                    type="date"
                    value={form.visitDate ?? ""}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="reportDate" className="block text-sm font-medium text-slate-700">
                    Report Date
                  </label>
                  <input
                    id="reportDate"
                    name="reportDate"
                    type="date"
                    value={form.reportDate ?? ""}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="siteAddress" className="block text-sm font-medium text-slate-700">
                  Location
                </label>
                <input
                  id="siteAddress"
                  name="siteAddress"
                  value={form.siteAddress ?? ""}
                  onChange={handleChange}
                  placeholder="City, province/state, or full site address"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="buildingPermitNo" className="block text-sm font-medium text-slate-700">
                    Building Permit No.
                  </label>
                  <input
                    id="buildingPermitNo"
                    name="buildingPermitNo"
                    value={form.buildingPermitNo ?? ""}
                    onChange={handleChange}
                    placeholder="e.g. BP2024-00799"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="contractorName" className="block text-sm font-medium text-slate-700">
                    Contractor
                  </label>
                  <input
                    id="contractorName"
                    name="contractorName"
                    value={form.contractorName ?? ""}
                    onChange={handleChange}
                    placeholder="General contractor name"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reasonForVisit" className="block text-sm font-medium text-slate-700">
                  Reason for Site Visit
                </label>
                <input
                  id="reasonForVisit"
                  name="reasonForVisit"
                  value={form.reasonForVisit ?? ""}
                  onChange={handleChange}
                  placeholder="e.g. Final Review, Monthly Review"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="preparedBy" className="block text-sm font-medium text-slate-700">
                    Prepared By
                  </label>
                  <input
                    id="preparedBy"
                    name="preparedBy"
                    value={form.preparedBy ?? ""}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="reviewedBy" className="block text-sm font-medium text-slate-700">
                    Reviewed By
                  </label>
                  <input
                    id="reviewedBy"
                    name="reviewedBy"
                    value={form.reviewedBy ?? ""}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="weatherConditions" className="block text-sm font-medium text-slate-700">
                    Weather Conditions
                  </label>
                  <input
                    id="weatherConditions"
                    name="weatherConditions"
                    value={form.weatherConditions ?? ""}
                    onChange={handleChange}
                    placeholder="e.g. Clear, 72°F"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="contractorPresent" className="block text-sm font-medium text-slate-700">
                    Present
                  </label>
                  <input
                    id="contractorPresent"
                    name="contractorPresent"
                    value={form.contractorPresent ?? ""}
                    onChange={handleChange}
                    placeholder="Attendees present during the visit"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="distributionList" className="block text-sm font-medium text-slate-700">
                  Distribution List
                </label>
                <textarea
                  id="distributionList"
                  name="distributionList"
                  rows={2}
                  value={form.distributionList ?? ""}
                  onChange={handleChange}
                  placeholder="Recipients of the final report"
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {saving
            ? "Saving…"
            : submitLabel ?? (isEditing ? "Save Changes" : "Create Project")}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
