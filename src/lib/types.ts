export interface Game {
  id: number;
  collection_id: number;
  title: string;
  sort_title: string | null;
  platform: string;
  developer: string | null;
  publisher: string | null;
  release_year: number | null;
  genre: string | null;
  series: string | null;
  max_players: string | null;
  play_mode: string | null;
  overview: string | null;
  application_path: string;
  root_folder: string | null;
  source: string | null;
  favorite: boolean;
  content_type: string;
  lb_id: string | null;
  lb_database_id: string | null;
}

export interface GameSummary {
  id: number;
  title: string;
  release_year: number | null;
  developer: string | null;
  publisher: string | null;
  genre: string | null;
  platform: string;
  favorite: boolean;
  content_type: string;
  installed: boolean;
}

export interface SearchResult {
  games: GameSummary[];
  total_count: number;
}

export interface FilterOptions {
  content_types: string[];
  genres: string[];
  developers: string[];
  publishers: string[];
  years: number[];
  series: string[];
  platforms: string[];
}

export type PathMode = "absolute" | "portable_drive";

export interface CollectionInfo {
  id: number;
  name: string;
  /** Raw stored path. For `path_mode === "portable_drive"` this lacks a drive letter. */
  path: string;
  path_mode: PathMode;
  game_count: number;
}

export interface PortableSuggestion {
  /** True iff the path is on the same drive as the running exoterm. */
  portable_available: boolean;
  /** What would land in `collections.path` (e.g. `\eXoDOS`) when portable is on. */
  portable_stored_path: string;
}

export interface AppConfig {
  collections: CollectionPath[];
  theme: string;
  crt_enabled: boolean;
  crt_intensity: number;
}

export interface CollectionPath {
  name: string;
  path: string;
}

export interface ChoicePayload {
  message: string;
  options: string[];
}

export type ContentType = "Game" | "Magazine" | "Book" | "Soundtrack" | "Video" | "Catalog";
export type SortField = "title" | "year" | "developer" | "publisher" | "genre" | "platform";
export type SortDir = "asc" | "desc";
export type Theme = "blue" | "bw" | "amber" | "green" | "win95" | "win3x";
