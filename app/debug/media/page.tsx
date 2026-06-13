"use client";

import { useCallback, useState } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth, useSupabase } from "@/context/AuthContext";
import { logMedia } from "@/lib/media-diagnostics";
import { saveMediaItem } from "@/lib/media-service";
import {
  getSignedMediaUrl,
  listRecentMediaForUser,
  MEDIA_BUCKET,
  type CloudMediaItem,
} from "@/lib/supabase/media-repository";
import { generateId } from "@/lib/utils";

function isDebugEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS === "true";
}

interface DiagnosticStep {
  name: string;
  status: "pending" | "running" | "ok" | "error";
  detail?: string;
}

export default function MediaDebugPage() {
  if (!isDebugEnabled()) {
    notFound();
  }

  return <MediaDebugContent />;
}

function MediaDebugContent() {
  const { user, session, loading: authLoading } = useAuth();
  const supabase = useSupabase();
  const [recentMedia, setRecentMedia] = useState<CloudMediaItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [steps, setSteps] = useState<DiagnosticStep[]>([]);
  const [runningTest, setRunningTest] = useState(false);

  const envPresent = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };

  const loadRecentMedia = useCallback(async () => {
    if (!user) {
      setRecentMedia([]);
      return;
    }

    try {
      const items = await listRecentMediaForUser(supabase, user.id, 20);
      setRecentMedia(items);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load media");
    }
  }, [supabase, user]);

  async function runUploadTest() {
    if (!user) return;

    setRunningTest(true);
    const nextSteps: DiagnosticStep[] = [
      { name: "Session check", status: "running" },
      { name: "Tiny storage upload", status: "pending" },
      { name: "media_items insert", status: "pending" },
      { name: "Signed URL generation", status: "pending" },
      { name: "Cleanup test object", status: "pending" },
    ];
    setSteps(nextSteps);

    const updateStep = (index: number, patch: Partial<DiagnosticStep>) => {
      nextSteps[index] = { ...nextSteps[index], ...patch };
      setSteps([...nextSteps]);
    };

    const testProjectId = generateId();
    const testObservationId = generateId();
    const testMediaId = generateId();
    let storagePath = "";

    try {
      if (!session) {
        updateStep(0, {
          status: "error",
          detail: "No active session",
        });
        return;
      }

      updateStep(0, {
        status: "ok",
        detail: `User ${user.id}`,
      });

      const blob = new Blob(["debug"], { type: "text/plain" });
      storagePath = `${user.id}/${testProjectId}/${testObservationId}/${testMediaId}/debug.txt`;

      updateStep(1, { status: "running" });
      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(storagePath, blob, {
          contentType: "text/plain",
          upsert: false,
        });

      if (uploadError) {
        updateStep(1, {
          status: "error",
          detail: uploadError.message,
        });
        return;
      }

      updateStep(1, {
        status: "ok",
        detail: storagePath,
      });

      updateStep(2, { status: "running" });
      const { error: insertError } = await supabase.from("media_items").insert({
        id: testMediaId,
        project_id: testProjectId,
        observation_id: testObservationId,
        user_id: user.id,
        type: "photo",
        storage_path: storagePath,
        filename: "debug.txt",
        mime_type: "text/plain",
        size: blob.size,
      });

      if (insertError) {
        updateStep(2, {
          status: "error",
          detail: insertError.message,
        });
        await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
        return;
      }

      updateStep(2, { status: "ok", detail: testMediaId });

      updateStep(3, { status: "running" });
      try {
        const signedUrl = await getSignedMediaUrl(supabase, storagePath);
        updateStep(3, {
          status: "ok",
          detail: signedUrl.slice(0, 80) + "…",
        });
      } catch (err) {
        updateStep(3, {
          status: "error",
          detail: err instanceof Error ? err.message : "Signed URL failed",
        });
      }

      updateStep(4, { status: "running" });
      await supabase.from("media_items").delete().eq("id", testMediaId);
      await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
      updateStep(4, { status: "ok", detail: "Removed test row and object" });

      logMedia("debug:test_complete", { userId: user.id, storagePath });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Test failed";
      const runningIndex = nextSteps.findIndex((step) => step.status === "running");
      if (runningIndex >= 0) {
        updateStep(runningIndex, { status: "error", detail: message });
      }
      if (storagePath) {
        await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]).catch(() => {});
      }
    } finally {
      setRunningTest(false);
      void loadRecentMedia();
    }
  }

  async function runSaveMediaTest() {
    if (!user) return;

    setRunningTest(true);
    setSteps([
      { name: "saveMediaItem (local blob)", status: "running" },
    ]);

    const testProjectId = generateId();
    const testObservationId = generateId();

    try {
      await saveMediaItem(
        {
          observationId: testObservationId,
          projectId: testProjectId,
          type: "audio",
          file: new Blob(["audio-debug"], { type: "audio/webm" }),
          filename: "debug.webm",
        },
        { userId: user.id, client: supabase },
      );

      setSteps([
        {
          name: "saveMediaItem (local blob)",
          status: "error",
          detail:
            "Upload succeeded without observation FK — expected failure if observation missing",
        },
      ]);
    } catch (err) {
      setSteps([
        {
          name: "saveMediaItem (local blob)",
          status: "ok",
          detail: err instanceof Error ? err.message : "Failed as expected without observation row",
        },
      ]);
    } finally {
      setRunningTest(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Media Debug</h1>
          <p className="mt-1 text-sm text-slate-500">
            Development-only diagnostics for Supabase media upload and signed URLs.
          </p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Environment</h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex justify-between gap-4">
              <dt>NEXT_PUBLIC_SUPABASE_URL</dt>
              <dd>{envPresent.supabaseUrl ? "present" : "missing"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>NEXT_PUBLIC_SUPABASE_ANON_KEY</dt>
              <dd>{envPresent.supabaseAnonKey ? "present" : "missing"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Storage bucket</dt>
              <dd>{MEDIA_BUCKET}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Session</h2>
          {authLoading ? (
            <p className="mt-2 text-sm text-slate-500">Loading auth…</p>
          ) : user ? (
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between gap-4">
                <dt>User ID</dt>
                <dd className="break-all font-mono text-xs">{user.id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Session active</dt>
                <dd>{session ? "yes" : "no"}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-amber-700">Not signed in.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent media_items
            </h2>
            <button
              type="button"
              onClick={() => void loadRecentMedia()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              Load / Refresh
            </button>
          </div>
          {loadError && (
            <p className="mt-2 text-sm text-red-600">{loadError}</p>
          )}
          {recentMedia.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              Click Load / Refresh to fetch recent rows.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-xs text-slate-700">
              {recentMedia.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="font-mono">{item.id}</div>
                  <div>
                    {item.type} · {item.filename} · {item.mimeType} · {item.size} bytes
                  </div>
                  <div className="break-all text-slate-500">{item.storagePath}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Tests</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!user || runningTest}
              onClick={() => void runUploadTest()}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Run storage + signed URL test
            </button>
            <button
              type="button"
              disabled={!user || runningTest}
              onClick={() => void runSaveMediaTest()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Run saveMediaItem FK probe
            </button>
          </div>

          {steps.length > 0 && (
            <ol className="mt-4 space-y-2">
              {steps.map((step) => (
                <li
                  key={step.name}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>{step.name}</span>
                    <span
                      className={
                        step.status === "ok"
                          ? "text-emerald-700"
                          : step.status === "error"
                            ? "text-red-700"
                            : "text-slate-500"
                      }
                    >
                      {step.status}
                    </span>
                  </div>
                  {step.detail && (
                    <p className="mt-1 break-all text-xs text-slate-600">
                      {step.detail}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </AppShell>
  );
}
