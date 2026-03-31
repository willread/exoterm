import { createSignal, createResource } from "solid-js";
import { createStore } from "solid-js/store";
import { searchGames, getGame, getFilterOptions, listCollections } from "./commands";
import type { ChoicePayload, ContentType, SortDir, SortField, Theme, GameSummary } from "./types";

// ── App state ──────────────────────────────────
export const [theme, setTheme] = createSignal<Theme>("blue");
export const [crtEnabled, setCrtEnabled] = createSignal(true);
export const [activePanel, setActivePanel] = createSignal<"sidebar" | "list" | "detail">("list");

// ── Dialog state ───────────────────────────────
export const [activeDialog, setActiveDialog] = createSignal<string | null>(null);
export const [activeMenu, setActiveMenu] = createSignal<string | null>(null);

// ── Game console / CHOICE dialog ───────────────
export const [gameChoice, setGameChoice] = createSignal<ChoicePayload | null>(null);

// ── Search & filter state ──────────────────────
export const [searchQuery, setSearchQuery] = createSignal("");
export const [selectedGameId, setSelectedGameId] = createSignal<number | null>(null);
export const [selectedIndex, setSelectedIndex] = createSignal(0);

export const [filters, setFilters] = createStore({
  contentType: "Game" as ContentType | "",
  genre: [] as string[],
  developer: [] as string[],
  publisher: [] as string[],
  year: [] as number[],
  series: [] as string[],
  platform: [] as string[],
  favoritesOnly: false,
  sortBy: "title" as SortField,
  sortDir: "asc" as SortDir,
  offset: 0,
  limit: 200,
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

// ── Filter options ─────────────────────────────
export const [filterOptions, { refetch: refetchFilterOptions }] = createResource(
  () => filters.contentType,
  (ct) => getFilterOptions(ct || undefined)
);

// ── Fetch games ────────────────────────────────
export async function fetchGames() {
  try {
    const result = await searchGames({
      query: searchQuery() || undefined,
      content_type: filters.contentType || undefined,
      genre: filters.genre.length > 0 ? filters.genre : undefined,
      developer: filters.developer.length > 0 ? filters.developer : undefined,
      publisher: filters.publisher.length > 0 ? filters.publisher : undefined,
      year: filters.year.length > 0 ? filters.year : undefined,
      series: filters.series.length > 0 ? filters.series : undefined,
      platform: filters.platform.length > 0 ? filters.platform : undefined,
      favorites_only: filters.favoritesOnly || undefined,
      sort_by: filters.sortBy,
      sort_dir: filters.sortDir,
      offset: filters.offset,
      limit: filters.limit,
    });
    setGameList(result.games);
    setTotalCount(result.total_count);
  } catch (e) {
    console.error("Search failed:", e);
  }
}
