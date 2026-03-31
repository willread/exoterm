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

export interface CollectionInfo {
  id: number;
  name: string;
  path: string;
  game_count: number;
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
export type Theme = "blue" | "bw" | "amber" | "green";
