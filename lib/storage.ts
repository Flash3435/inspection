import { migrateStore } from "./migrate-store";
import { STORAGE_KEY } from "./constants";
import type { InspectionStore } from "./types";

export const EMPTY_STORE: InspectionStore = {
  projects: [],
  observations: [],
};

export function loadStore(): InspectionStore {
  if (typeof window === "undefined") {
    return EMPTY_STORE;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STORE;
    return migrateStore(JSON.parse(raw) as InspectionStore);
  } catch {
    return EMPTY_STORE;
  }
}

export function saveStore(store: InspectionStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}
