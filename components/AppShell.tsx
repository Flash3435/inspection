"use client";

import { useAuth } from "@/context/AuthContext";
import { Header } from "./Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-400">
        {user
          ? "Projects sync to your cloud account."
          : "Sign in to sync projects across devices."}
      </footer>
    </div>
  );
}
