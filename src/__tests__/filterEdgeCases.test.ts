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
  setFilters("genre", null);
  setFilters("developer", null);
  setFilters("publisher", null);
  setFilters("year", null);
  setFilters("series", null);
  setFilters("platform", null);
  setFilters("favoritesOnly", false);
  setFilters("sortBy", "title");
  setFilters("sortDir", "asc");
  setFilters("offset", 0);
  setFilters("limit", 200);
});

describe("remaining filter params passed to search_games", () => {
  it("passes developer filter when set", async () => {
    setFilters("developer", "id Software");
    await fetchGames();
    expect(getSearchCall().developer).toBe("id Software");
  });

  it("omits developer when null", async () => {
    setFilters("developer", null);
    await fetchGames();
    expect(getSearchCall().developer).toBeUndefined();
  });

  it("passes publisher filter when set", async () => {
    setFilters("publisher", "GT Interactive");
    await fetchGames();
    expect(getSearchCall().publisher).toBe("GT Interactive");
  });

  it("omits publisher when null", async () => {
    setFilters("publisher", null);
    await fetchGames();
    expect(getSearchCall().publisher).toBeUndefined();
  });

  it("passes series filter when set", async () => {
    setFilters("series", "Doom");
    await fetchGames();
    expect(getSearchCall().series).toBe("Doom");
  });

  it("omits series when null", async () => {
    setFilters("series", null);
    await fetchGames();
    expect(getSearchCall().series).toBeUndefined();
  });

  it("passes platform filter when set", async () => {
    setFilters("platform", "MS-DOS");
    await fetchGames();
    expect(getSearchCall().platform).toBe("MS-DOS");
  });

  it("omits platform when null", async () => {
    setFilters("platform", null);
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
    expect(params.genre).toBe("Action");
    expect(params.developer).toBe("id Software");
    expect(params.publisher).toBe("GT Interactive");
    expect(params.year).toBe(1993);
    expect(params.series).toBe("Doom");
    expect(params.platform).toBe("MS-DOS");
    expect(params.favorites_only).toBe(true);
    expect(params.sort_by).toBe("year");
    expect(params.sort_dir).toBe("desc");
    expect(params.offset).toBe(40);
    expect(params.limit).toBe(20);
  });

  it("favorites + genre filter omits null fields", async () => {
    setFilters("genre", "RPG");
    setFilters("favoritesOnly", true);
    // All other optional filters left as null

    await fetchGames();

    const params = getSearchCall();
    expect(params.genre).toBe("RPG");
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
    expect(params.platform).toBe("MS-DOS");
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
