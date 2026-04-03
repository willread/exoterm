import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";

// Import after mock is set up in setup.ts
import {
  searchGames,
  getGame,
  toggleFavorite,
  validateCollectionPath,
  launchGame,
  listCollections,
} from "../lib/commands";

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("searchGames", () => {
  it("calls invoke with search_games and provided params", async () => {
    mockInvoke.mockResolvedValueOnce({ games: [], total_count: 0 });
    await searchGames({ query: "doom", content_type: "Game" });
    expect(mockInvoke).toHaveBeenCalledWith("search_games", {
      query: "doom",
      content_type: "Game",
    });
  });

  it("passes sort params through", async () => {
    mockInvoke.mockResolvedValueOnce({ games: [], total_count: 0 });
    await searchGames({ sort_by: "year", sort_dir: "desc", offset: 100, limit: 50 });
    expect(mockInvoke).toHaveBeenCalledWith("search_games", {
      sort_by: "year",
      sort_dir: "desc",
      offset: 100,
      limit: 50,
    });
  });

  it("passes filter params through", async () => {
    mockInvoke.mockResolvedValueOnce({ games: [], total_count: 0 });
    await searchGames({ genre: "Action", developer: "id Software", year: 1993 });
    expect(mockInvoke).toHaveBeenCalledWith("search_games", {
      genre: "Action",
      developer: "id Software",
      year: 1993,
    });
  });

  it("passes favorites_only flag", async () => {
    mockInvoke.mockResolvedValueOnce({ games: [], total_count: 0 });
    await searchGames({ favorites_only: true });
    expect(mockInvoke).toHaveBeenCalledWith("search_games", { favorites_only: true });
  });

  it("returns SearchResult from invoke response", async () => {
    const mockResult = {
      games: [{ id: 1, title: "Doom", release_year: 1993, developer: "id Software", publisher: "GT Interactive", genre: "Action", platform: "MS-DOS", favorite: false, content_type: "Game", installed: true }],
      total_count: 1,
    };
    mockInvoke.mockResolvedValueOnce(mockResult);
    const result = await searchGames({});
    expect(result.games).toHaveLength(1);
    expect(result.total_count).toBe(1);
    expect(result.games[0].title).toBe("Doom");
  });
});

describe("getGame", () => {
  it("calls invoke with get_game and id", async () => {
    mockInvoke.mockResolvedValueOnce({ id: 42, title: "Quake" });
    await getGame(42);
    expect(mockInvoke).toHaveBeenCalledWith("get_game", { id: 42 });
  });
});

describe("toggleFavorite", () => {
  it("calls invoke with toggle_favorite and id", async () => {
    mockInvoke.mockResolvedValueOnce(true);
    const result = await toggleFavorite(7);
    expect(mockInvoke).toHaveBeenCalledWith("toggle_favorite", { id: 7 });
    expect(result).toBe(true);
  });

  it("returns new favorite state", async () => {
    mockInvoke.mockResolvedValueOnce(false);
    const result = await toggleFavorite(7);
    expect(result).toBe(false);
  });
});

describe("validateCollectionPath", () => {
  it("calls invoke with path", async () => {
    mockInvoke.mockResolvedValueOnce(true);
    const result = await validateCollectionPath("E:\\Exo\\eXoDOS");
    expect(mockInvoke).toHaveBeenCalledWith("validate_collection_path", {
      path: "E:\\Exo\\eXoDOS",
    });
    expect(result).toBe(true);
  });

  it("returns false for invalid path", async () => {
    mockInvoke.mockResolvedValueOnce(false);
    const result = await validateCollectionPath("C:\\NotACollection");
    expect(result).toBe(false);
  });
});

describe("launchGame", () => {
  it("calls invoke with launch_game and id", async () => {
    mockInvoke.mockResolvedValueOnce("Launched: E:\\Exo\\eXoDOS\\eXo\\eXoDOS\\!dos\\Doom\\Doom.bat");
    await launchGame(1);
    expect(mockInvoke).toHaveBeenCalledWith("launch_game", { id: 1 });
  });
});

describe("listCollections", () => {
  it("calls invoke with list_collections", async () => {
    mockInvoke.mockResolvedValueOnce([]);
    await listCollections();
    expect(mockInvoke).toHaveBeenCalledWith("list_collections");
  });

  it("returns collection list", async () => {
    const mockCollections = [
      { id: 1, name: "eXoDOS", path: "E:\\Exo\\eXoDOS", game_count: 12000 },
    ];
    mockInvoke.mockResolvedValueOnce(mockCollections);
    const result = await listCollections();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("eXoDOS");
    expect(result[0].game_count).toBe(12000);
  });
});
