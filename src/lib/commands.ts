import { invoke } from "@tauri-apps/api/core";
import type {
  AppConfig,
  CollectionInfo,
  FilterOptions,
  Game,
  SearchResult,
} from "./types";

export async function searchGames(params: {
  query?: string;
  content_type?: string;
  genre?: string[];
  developer?: string[];
  publisher?: string[];
  year?: number[];
  series?: string[];
  platform?: string[];
  favorites_only?: boolean;
  sort_by?: string;
  sort_dir?: string;
  offset?: number;
  limit?: number;
}): Promise<SearchResult> {
  return invoke("search_games", params);
}

export async function getGame(id: number): Promise<Game> {
  return invoke("get_game", { id });
}

export async function getFilterOptions(params: {
  content_type?: string;
  genre?: string;
  developer?: string;
  publisher?: string;
  year?: number;
  series?: string;
  platform?: string;
  favorites_only?: boolean;
}): Promise<FilterOptions> {
  return invoke("get_filter_options", params);
}

export interface GameImage {
  category: string;
  data_url: string;
}

export async function getGameImages(id: number): Promise<GameImage[]> {
  return invoke("get_game_images", { id });
}

export async function toggleFavorite(id: number): Promise<boolean> {
  return invoke("toggle_favorite", { id });
}

export async function scanCollection(
  name: string,
  path: string
): Promise<number> {
  return invoke("scan_collection", { name, path });
}

export async function listCollections(): Promise<CollectionInfo[]> {
  return invoke("list_collections");
}

export async function validateCollectionPath(
  path: string
): Promise<boolean> {
  return invoke("validate_collection_path", { path });
}

export async function deleteCollection(id: number): Promise<void> {
  return invoke("delete_collection", { id });
}

export async function launchGame(id: number): Promise<string> {
  return invoke("launch_game", { id });
}

export async function killGame(): Promise<void> {
  return invoke("kill_game");
}

export async function sendGameInput(input: string): Promise<void> {
  return invoke("send_game_input", { input });
}

export async function getConfig(): Promise<AppConfig> {
  return invoke("get_config");
}

export async function setConfig(config: AppConfig): Promise<void> {
  return invoke("set_config", { config });
}
