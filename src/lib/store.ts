import { createSignal, createResource } from "solid-js";
import { createStore } from "solid-js/store";
import { searchGames, getGame, getFilterOptions, listCollections } from "./commands";
import type { ChoicePayload, SortDir, SortField, Theme, GameSummary, FilterOptions } from "./types";

// ── App state ──────────────────────────────────
export const [theme, setTheme] = createSignal<Theme>("blue");
export const [crtEnabled, setCrtEnabled] = createSignal(true);
export const [activePanel, setActivePanel] = createSignal<"sidebar" | "list" | "detail">("list");
export const [fontSize, setFontSize] = createSignal(16); // px, default 16

// ── Dialog state ───────────────────────────────
export const [activeDialog, setActiveDialog] = createSignal<string | null>(null);
export const [activeMenu, setActiveMenu] = createSignal<string | null>(null);

// ── Game console / CHOICE dialog ───────────────
export const [gameChoice, setGameChoice] = createSignal<ChoicePayload | null>(null);

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
