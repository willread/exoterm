import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  fetchGames,
  gameList,
  totalCount,
  setGameList,
  setTotalCount,
  setSearchQuery,
  setFilters,
  filters,
} from "../lib/store";

const mockInvoke = vi.mocked(invoke);

function makeGame(overrides = {}) {
  return {
    id: 1,
    title: "Doom",
    release_year: 1993,
    developer: "id Software",
    publisher: "GT Interactive",
    genre: "Action",
    platform: "MS-DOS",
    favorite: false,
    content_type: "Game",
    ...overrides,
  };
}

beforeEach(() => {
  mockInvoke.mockReset();
  // Default mock: return empty list for search_games, null for everything else
  mockInvoke.mockImplementation(async (cmd) => {
    if (cmd === "search_games") return { games: [], total_count: 0 };
    return null;
  });
  // Reset store state to defaults
  setGameList([]);
  setTotalCount(0);
  setSearchQuery("");
  setFilters("contentType", "Game");
  setFilters("genre", []);
  setFilters("developer", []);
  setFilters("publisher", []);
  setFilters("year", []);
  setFilters("series", []);
  setFilters("platform", []);
  setFilters("favoritesOnly", false);
  setFilters("sortBy", "title");
  setFilters("sortDir", "asc");
  setFilters("offset", 0);
  setFilters("limit", 200);
});

describe("fetchGames", () => {
  it("updates gameList and totalCount on success", async () => {
    const games = [makeGame(), makeGame({ id: 2, title: "Quake" })];
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === "search_games") return { games, total_count: 2 };
      return null;
    });

    await fetchGames();

    expect(gameList()).toHaveLength(2);
    expect(gameList()[0].title).toBe("Doom");
    expect(gameList()[1].title).toBe("Quake");
    expect(totalCount()).toBe(2);
  });

  it("passes search query to search_games when set", async () => {
    setSearchQuery("wolf");
    mockInvoke.mockImplementation(async (cmd, params: any) => {
      if (cmd === "search_games") return { games: [], total_count: 0 };
      return null;
    });

    await fetchGames();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect(call).toBeDefined();
    expect((call![1] as any).query).toBe("wolf");
  });

  it("sends query as undefined when search query is empty", async () => {
    setSearchQuery("");

    await fetchGames();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect((call![1] as any).query).toBeUndefined();
  });

  it("passes content_type filter to search_games", async () => {
    setFilters("contentType", "Magazine");

    await fetchGames();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect((call![1] as any).content_type).toBe("Magazine");
  });

  it("passes genre filter array when set", async () => {
    setFilters("genre", ["Action"]);

    await fetchGames();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect((call![1] as any).genre).toEqual(["Action"]);
  });

  it("passes multiple genres as array", async () => {
    setFilters("genre", ["Action", "RPG"]);

    await fetchGames();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect((call![1] as any).genre).toEqual(["Action", "RPG"]);
  });

  it("omits genre when array is empty", async () => {
    setFilters("genre", []);

    await fetchGames();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect((call![1] as any).genre).toBeUndefined();
  });

  it("passes year filter array when set", async () => {
    setFilters("year", [1993]);

    await fetchGames();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect((call![1] as any).year).toEqual([1993]);
  });

  it("omits year when array is empty", async () => {
    setFilters("year", []);

    await fetchGames();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect((call![1] as any).year).toBeUndefined();
  });

  it("passes favorites_only: true when favoritesOnly is set", async () => {
    setFilters("favoritesOnly", true);

    await fetchGames();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect((call![1] as any).favorites_only).toBe(true);
  });

  it("omits favorites_only when false", async () => {
    setFilters("favoritesOnly", false);

    await fetchGames();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect((call![1] as any).favorites_only).toBeUndefined();
  });

  it("passes sort_by and sort_dir from filters", async () => {
    setFilters("sortBy", "year");
    setFilters("sortDir", "desc");

    await fetchGames();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect((call![1] as any).sort_by).toBe("year");
    expect((call![1] as any).sort_dir).toBe("desc");
  });

  it("passes offset and limit for pagination", async () => {
    setFilters("offset", 200);
    setFilters("limit", 100);

    await fetchGames();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect((call![1] as any).offset).toBe(200);
    expect((call![1] as any).limit).toBe(100);
  });

  it("does not throw when search_games rejects", async () => {
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === "search_games") throw new Error("DB error");
      return null;
    });

    // Should not throw — error is caught internally
    await expect(fetchGames()).resolves.toBeUndefined();
  });

  it("leaves gameList unchanged when search_games rejects", async () => {
    const existing = [makeGame()];
    setGameList(existing);
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === "search_games") throw new Error("DB error");
      return null;
    });

    await fetchGames();

    // Stale state is preserved — user sees last good result
    expect(gameList()).toHaveLength(1);
  });
});
