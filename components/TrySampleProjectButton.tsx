"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useInspection } from "@/context/InspectionContext";

interface TrySampleProjectButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  label?: string;
}

export function TrySampleProjectButton({
  variant = "secondary",
  className = "",
  label = "Try Sample Project",
}: TrySampleProjectButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { findSampleProject, seedSampleProject } = useInspection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick(forceNew = false) {
    if (!user) {
      router.push("/login?redirect=/");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const existing = findSampleProject();

      if (existing && !forceNew) {
        const openExisting = window.confirm(
          "A sample project already exists. Open it now?\n\nChoose Cancel to create a fresh sample copy instead.",
        );

        if (openExisting) {
          router.push(`/projects/${existing.id}`);
          return;
        }

        const project = await seedSampleProject({ forceNew: true });
        router.push(`/projects/${project.id}`);
        return;
      }

      const project = await seedSampleProject(
        forceNew ? { forceNew: true } : undefined,
      );
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create the sample project.",
      );
    } finally {
      setLoading(false);
    }
  }

  const variantClass =
    variant === "primary"
      ? "bg-slate-800 text-white hover:bg-slate-700"
      : variant === "ghost"
        ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleClick(false)}
        disabled={loading}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${variantClass}`}
      >
        {loading ? "Creating sample…" : label}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
