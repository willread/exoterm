/**
 * Tests for fetchGames parameter mapping not covered in store.test.ts:
 * developer, publisher, series, platform filters; all content types;
 * combined multiple active filters.
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

describe("remaining filter params passed to search_games", () => {
  it("passes developer filter array when set", async () => {
    setFilters("developer", ["id Software"]);
    await fetchGames();
    expect(getSearchCall().developer).toEqual(["id Software"]);
  });

  it("passes multiple developers as array", async () => {
    setFilters("developer", ["id Software", "Apogee"]);
    await fetchGames();
    expect(getSearchCall().developer).toEqual(["id Software", "Apogee"]);
  });

  it("omits developer when array is empty", async () => {
    setFilters("developer", []);
    await fetchGames();
    expect(getSearchCall().developer).toBeUndefined();
  });

  it("passes publisher filter array when set", async () => {
    setFilters("publisher", ["GT Interactive"]);
    await fetchGames();
    expect(getSearchCall().publisher).toEqual(["GT Interactive"]);
  });

  it("omits publisher when array is empty", async () => {
    setFilters("publisher", []);
    await fetchGames();
    expect(getSearchCall().publisher).toBeUndefined();
  });

  it("passes series filter array when set", async () => {
    setFilters("series", ["Doom"]);
    await fetchGames();
    expect(getSearchCall().series).toEqual(["Doom"]);
  });

  it("omits series when array is empty", async () => {
    setFilters("series", []);
    await fetchGames();
    expect(getSearchCall().series).toBeUndefined();
  });

  it("passes platform filter array when set", async () => {
    setFilters("platform", ["MS-DOS"]);
    await fetchGames();
    expect(getSearchCall().platform).toEqual(["MS-DOS"]);
  });

  it("passes multiple platforms as array", async () => {
    setFilters("platform", ["MS-DOS", "Windows 3.x"]);
    await fetchGames();
    expect(getSearchCall().platform).toEqual(["MS-DOS", "Windows 3.x"]);
  });

  it("omits platform when array is empty", async () => {
    setFilters("platform", []);
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
    setFilters("genre", ["Action"]);
    setFilters("developer", ["id Software"]);
    setFilters("publisher", ["GT Interactive"]);
    setFilters("year", [1993]);
    setFilters("series", ["Doom"]);
    setFilters("platform", ["MS-DOS"]);
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

  it("favorites + multi-genre filter omits empty fields", async () => {
    setFilters("genre", ["RPG", "Action"]);
    setFilters("favoritesOnly", true);
    // All other optional filters left as empty arrays

    await fetchGames();

    const params = getSearchCall();
    expect(params.genre).toEqual(["RPG", "Action"]);
    expect(params.favorites_only).toBe(true);
    expect(params.developer).toBeUndefined();
    expect(params.publisher).toBeUndefined();
    expect(params.year).toBeUndefined();
    expect(params.series).toBeUndefined();
    expect(params.platform).toBeUndefined();
    expect(params.query).toBeUndefined();
  });

  it("search query + content type + multi-platform filter combined", async () => {
    setSearchQuery("wolf");
    setFilters("contentType", "Game");
    setFilters("platform", ["MS-DOS", "Windows 3.x"]);

    await fetchGames();

    const params = getSearchCall();
    expect(params.query).toBe("wolf");
    expect(params.content_type).toBe("Game");
    expect(params.platform).toEqual(["MS-DOS", "Windows 3.x"]);
  });
});

describe("search query edge cases", () => {
  it("trims leading/trailing spaces as-is (passes raw value to backend)", async () => {
    // The frontend passes the value as typed — FTS handling is backend's job
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
    // FTS escaping is the backend's responsibility; frontend sends raw text
    setSearchQuery('wolf"stein');
    await fetchGames();
    expect(getSearchCall().query).toBe('wolf"stein');
  });
});
