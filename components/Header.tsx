"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrySampleProjectButton } from "./TrySampleProjectButton";
import { useAuth } from "@/context/AuthContext";

export function Header() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-white">
            IR
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              InspectReport
            </p>
            <p className="text-xs text-slate-500">
              Mechanical &amp; HVAC Inspections
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-4">
          <Link
            href="/"
            className="font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Dashboard
          </Link>
          {!loading && user && (
            <>
              <TrySampleProjectButton
                variant="ghost"
                className="hidden sm:block"
                label="Try Sample"
              />
              <Link
                href="/projects/new"
                className="rounded-lg bg-slate-800 px-3 py-2 font-medium text-white transition-colors hover:bg-slate-700"
              >
                New Project
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="rounded-lg px-3 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
            </>
          )}
          {!loading && !user && (
            <Link
              href="/login"
              className="rounded-lg bg-slate-800 px-3 py-2 font-medium text-white transition-colors hover:bg-slate-700"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
