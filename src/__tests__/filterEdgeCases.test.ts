/**
 * Tests for fetchGames parameter mapping: single-select filters,
 * all content types, combined filter scenarios.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  fetchGames,
  setFilters,
  setSearchQuery,
  setGameList,
  setTotalCount,
} from "../lib/store";

const mockInvoke = vi.mocked(invoke);

function getSearchCall() {
  const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
  if (!call) throw new Error("search_games was not called");
  return call[1] as Record<string, any>;
}

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockImplementation(async (cmd) => {
    if (cmd === "search_games") return { games: [], total_count: 0 };
    return null;
  });
  setGameList([]);
  setTotalCount(0);
  setSearchQuery("");
  setFilters("contentType", "Game");
  setFilters("genre", "");
  setFilters("developer", "");
  setFilters("publisher", "");
  setFilters("year", null);
  setFilters("series", "");
  setFilters("platform", "");
  setFilters("favoritesOnly", false);
  setFilters("sortBy", "title");
  setFilters("sortDir", "asc");
  setFilters("offset", 0);
  setFilters("limit", 50000);
});

describe("single-select filter params passed to search_games", () => {
  it("passes developer as single-element array when set", async () => {
    setFilters("developer", "id Software");
    await fetchGames();
    expect(getSearchCall().developer).toEqual(["id Software"]);
  });

  it("omits developer when empty", async () => {
    setFilters("developer", "");
    await fetchGames();
    expect(getSearchCall().developer).toBeUndefined();
  });

  it("passes publisher as single-element array when set", async () => {
    setFilters("publisher", "GT Interactive");
    await fetchGames();
    expect(getSearchCall().publisher).toEqual(["GT Interactive"]);
  });

  it("omits publisher when empty", async () => {
    setFilters("publisher", "");
    await fetchGames();
    expect(getSearchCall().publisher).toBeUndefined();
  });

  it("passes series as single-element array when set", async () => {
    setFilters("series", "Doom");
    await fetchGames();
    expect(getSearchCall().series).toEqual(["Doom"]);
  });

  it("omits series when empty", async () => {
    setFilters("series", "");
    await fetchGames();
    expect(getSearchCall().series).toBeUndefined();
  });

  it("passes platform as single-element array when set", async () => {
    setFilters("platform", "MS-DOS");
    await fetchGames();
    expect(getSearchCall().platform).toEqual(["MS-DOS"]);
  });

  it("omits platform when empty", async () => {
    setFilters("platform", "");
    await fetchGames();
    expect(getSearchCall().platform).toBeUndefined();
  });
});

describe("content type variants", () => {
  const types = ["Game", "Magazine", "Book", "Soundtrack", "Video", "Catalog"] as const;

  for (const ct of types) {
    it(`passes content_type "${ct}" correctly`, async () => {
      setFilters("contentType", ct);
      await fetchGames();
      expect(getSearchCall().content_type).toBe(ct);
    });
  }

  it('sends content_type as undefined when set to "" (All)', async () => {
    setFilters("contentType", "");
    await fetchGames();
    expect(getSearchCall().content_type).toBeUndefined();
  });
});

describe("combined filter scenarios", () => {
  it("sends all active filters simultaneously", async () => {
    setSearchQuery("doom");
    setFilters("contentType", "Game");
    setFilters("genre", "Action");
    setFilters("developer", "id Software");
    setFilters("publisher", "GT Interactive");
    setFilters("year", 1993);
    setFilters("series", "Doom");
    setFilters("platform", "MS-DOS");
    setFilters("favoritesOnly", true);
    setFilters("sortBy", "year");
    setFilters("sortDir", "desc");
    setFilters("offset", 40);
    setFilters("limit", 20);

    await fetchGames();

    const params = getSearchCall();
    expect(params.query).toBe("doom");
    expect(params.content_type).toBe("Game");
    expect(params.genre).toEqual(["Action"]);
    expect(params.developer).toEqual(["id Software"]);
    expect(params.publisher).toEqual(["GT Interactive"]);
    expect(params.year).toEqual([1993]);
    expect(params.series).toEqual(["Doom"]);
    expect(params.platform).toEqual(["MS-DOS"]);
    expect(params.favorites_only).toBe(true);
    expect(params.sort_by).toBe("year");
    expect(params.sort_dir).toBe("desc");
    expect(params.offset).toBe(40);
    expect(params.limit).toBe(20);
  });

  it("favorites + genre filter omits empty fields", async () => {
    setFilters("genre", "RPG");
    setFilters("favoritesOnly", true);

    await fetchGames();

    const params = getSearchCall();
    expect(params.genre).toEqual(["RPG"]);
    expect(params.favorites_only).toBe(true);
    expect(params.developer).toBeUndefined();
    expect(params.publisher).toBeUndefined();
    expect(params.year).toBeUndefined();
    expect(params.series).toBeUndefined();
    expect(params.platform).toBeUndefined();
    expect(params.query).toBeUndefined();
  });

  it("search query + content type + platform filter combined", async () => {
    setSearchQuery("wolf");
    setFilters("contentType", "Game");
    setFilters("platform", "MS-DOS");

    await fetchGames();

    const params = getSearchCall();
    expect(params.query).toBe("wolf");
    expect(params.content_type).toBe("Game");
    expect(params.platform).toEqual(["MS-DOS"]);
  });
});

describe("search query edge cases", () => {
  it("trims leading/trailing spaces as-is (passes raw value to backend)", async () => {
    setSearchQuery("  doom  ");
    await fetchGames();
    expect(getSearchCall().query).toBe("  doom  ");
  });

  it("passes multi-word queries through unchanged", async () => {
    setSearchQuery("id software doom");
    await fetchGames();
    expect(getSearchCall().query).toBe("id software doom");
  });

  it("passes queries with numbers through", async () => {
    setSearchQuery("doom 2");
    await fetchGames();
    expect(getSearchCall().query).toBe("doom 2");
  });

  it("passes query with special characters through", async () => {
    setSearchQuery('wolf"stein');
    await fetchGames();
    expect(getSearchCall().query).toBe('wolf"stein');
  });
});
