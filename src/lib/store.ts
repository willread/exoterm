import { createSignal, createResource } from "solid-js";
import { createStore } from "solid-js/store";
import { searchGames, getGame, getFilterOptions, listCollections } from "./commands";
import type { SortDir, SortField, Theme, GameSummary, FilterOptions } from "./types";

// ── App state ──────────────────────────────────
export const [theme, setTheme] = createSignal<Theme>("blue");
export const [crtEnabled, setCrtEnabled] = createSignal(false);
export const [activePanel, setActivePanel] = createSignal<"sidebar" | "list" | "detail">("list");
export const [searchFocused, setSearchFocused] = createSignal(false);
export const [fontSize, setFontSize] = createSignal(16); // px, default 16

// ── Layout state (persisted) ──────────────────
export const [sidebarWidth, setSidebarWidth] = createSignal(200);
export const [detailWidth, setDetailWidth] = createSignal(320);

// ── Dialog state ───────────────────────────────
export const [activeDialog, setActiveDialog] = createSignal<string | null>(null);
export const [activeMenu, setActiveMenu] = createSignal<string | null>(null);

// ── Search & filter state ──────────────────────
export const [searchQuery, setSearchQuery] = createSignal("");
export const [selectedGameId, setSelectedGameId] = createSignal<number | null>(null);
export const [selectedIndex, setSelectedIndex] = createSignal(0);

// Single-select filters: each category holds a single value (empty = none).
export const [filters, setFilters] = createStore({
  contentType: "" as string,
  genre: "" as string,
  developer: "" as string,
  publisher: "" as string,
  year: null as number | null,
  series: "" as string,
  platform: "" as string,
  favoritesOnly: false,
  sortBy: "title" as SortField,
  sortDir: "asc" as SortDir,
  offset: 0,
  limit: 50000,
});

// ── Loading state ──────────────────────────────
export const [scanning, setScanning] = createSignal(false);
export const [scanStatus, setScanStatus] = createSignal("");

// ── Cached game list for keyboard nav ──────────
export const [gameList, setGameList] = createSignal<GameSummary[]>([]);
export const [totalCount, setTotalCount] = createSignal(0);

// ── Collections ────────────────────────────────
export const [collections, { refetch: refetchCollections }] = createResource(listCollections);

// ── Derived: selected game details ─────────────
export const [selectedGame, { refetch: refetchSelectedGame }] = createResource(
  selectedGameId,
  (id) => (id ? getGame(id) : Promise.resolve(null))
);

// ── Filter options (cascading) ────────────────
export const [filterOptions, setFilterOptions] = createSignal<FilterOptions>({
  content_types: [],
  genres: [],
  developers: [],
  publishers: [],
  years: [],
  series: [],
  platforms: [],
});

let _filterOptSeq = 0;

export async function fetchFilterOptions() {
  const seq = ++_filterOptSeq;
  try {
    const result = await getFilterOptions({
      content_type: filters.contentType || undefined,
      genre: filters.genre || undefined,
      developer: filters.developer || undefined,
      publisher: filters.publisher || undefined,
      year: filters.year ?? undefined,
      series: filters.series || undefined,
      platform: filters.platform || undefined,
      favorites_only: filters.favoritesOnly || undefined,
    });
    if (seq !== _filterOptSeq) return;
    setFilterOptions(result);
  } catch (e) {
    console.error("Failed to fetch filter options:", e);
  }
}

// Keep backward-compatible alias used in tests
export const refetchFilterOptions = fetchFilterOptions;

// ── Fetch games ────────────────────────────────
let _fetchSeq = 0;

export async function fetchGames() {
  const seq = ++_fetchSeq;
  try {
    const result = await searchGames({
      query: searchQuery() || undefined,
      content_type: filters.contentType || undefined,
      genre: filters.genre ? [filters.genre] : undefined,
      developer: filters.developer ? [filters.developer] : undefined,
      publisher: filters.publisher ? [filters.publisher] : undefined,
      year: filters.year != null ? [filters.year] : undefined,
      series: filters.series ? [filters.series] : undefined,
      platform: filters.platform ? [filters.platform] : undefined,
      favorites_only: filters.favoritesOnly || undefined,
      sort_by: filters.sortBy,
      sort_dir: filters.sortDir,
      offset: filters.offset,
      limit: filters.limit,
    });
    if (seq !== _fetchSeq) return; // stale — a newer request is already in flight
    setGameList(result.games);
    setTotalCount(result.total_count);
  } catch (e) {
    console.error("Search failed:", e);
  }
}

// ── Persistence helpers ───────────────────────
/** Collect all persisted state into a plain object */
export function getPersistedState(): Record<string, any> {
  return {
    theme: theme(),
    crtEnabled: crtEnabled(),
    fontSize: fontSize(),
    sidebarWidth: sidebarWidth(),
    detailWidth: detailWidth(),
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    contentType: filters.contentType,
    genre: filters.genre,
    developer: filters.developer,
    publisher: filters.publisher,
    year: filters.year,
    series: filters.series,
    platform: filters.platform,
    favoritesOnly: filters.favoritesOnly,
  };
}

/** Restore persisted state from a plain object */
export function restorePersistedState(saved: Record<string, any>): void {
  if (saved.theme) setTheme(saved.theme);
  if (saved.crtEnabled !== undefined) setCrtEnabled(saved.crtEnabled);
  if (saved.fontSize) setFontSize(saved.fontSize);
  if (saved.sidebarWidth) setSidebarWidth(saved.sidebarWidth);
  if (saved.detailWidth) setDetailWidth(saved.detailWidth);
  if (saved.sortBy) setFilters("sortBy", saved.sortBy);
  if (saved.sortDir) setFilters("sortDir", saved.sortDir);
  if (saved.contentType !== undefined) setFilters("contentType", saved.contentType);
  if (saved.genre !== undefined) setFilters("genre", saved.genre);
  if (saved.developer !== undefined) setFilters("developer", saved.developer);
  if (saved.publisher !== undefined) setFilters("publisher", saved.publisher);
  if (saved.year !== undefined) setFilters("year", saved.year);
  if (saved.series !== undefined) setFilters("series", saved.series);
  if (saved.platform !== undefined) setFilters("platform", saved.platform);
  if (saved.favoritesOnly !== undefined) setFilters("favoritesOnly", saved.favoritesOnly);
}
