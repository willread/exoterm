/**
 * Persistence layer using @tauri-apps/plugin-store.
 * Saves/restores view state: theme, CRT, font size, panel widths,
 * filters, sort, sidebar section open/closed state.
 */
import { load, type Store } from "@tauri-apps/plugin-store";

let store: Store | null = null;

// Debounce timer for batching writes
let _saveTimer: number | undefined;

async function getStore(): Promise<Store> {
  if (!store) {
    store = await load("view-state.json", { autoSave: false });
  }
  return store;
}

export async function loadState(): Promise<Record<string, any>> {
  try {
    const s = await getStore();
    const entries = await s.entries();
    const result: Record<string, any> = {};
    for (const [key, value] of entries) {
      result[key] = value;
    }
    return result;
  } catch (e) {
    console.warn("Failed to load persisted state:", e);
    return {};
  }
}

export async function saveState(state: Record<string, any>): Promise<void> {
  try {
    const s = await getStore();
    for (const [key, value] of Object.entries(state)) {
      await s.set(key, value);
    }
    await s.save();
  } catch (e) {
    console.warn("Failed to save state:", e);
  }
}

/** Debounced save — batches rapid changes (e.g. resize dragging) */
export function saveStateDebounced(state: Record<string, any>): void {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = window.setTimeout(() => {
    saveState(state);
  }, 500);
}
