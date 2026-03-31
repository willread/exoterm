import { describe, it, expect, beforeEach } from "vitest";
import { createRoot } from "solid-js";

// We test filter state mutation logic in isolation
// The store uses module-level signals so we test the shape of params built from filter state

describe("filter state → searchGames params", () => {
  // Helper to simulate what fetchGames() passes to searchGames()
  function buildParams(overrides: Record<string, any> = {}) {
    const base = {
      query: "",
      content_type: "Game",
      genre: null,
      developer: null,
      publisher: null,
      year: null,
      series: null,
      platform: null,
      favorites_only: false,
      sort_by: "title",
      sort_dir: "asc",
      offset: 0,
      limit: 50000,
    };
    const merged = { ...base, ...overrides };
    // Replicate the fetchGames filtering logic: undefined for falsy optionals
    return {
      query: merged.query || undefined,
      content_type: merged.content_type || undefined,
      genre: merged.genre || undefined,
      developer: merged.developer || undefined,
      publisher: merged.publisher || undefined,
      year: merged.year || undefined,
      series: merged.series || undefined,
      platform: merged.platform || undefined,
      favorites_only: merged.favorites_only || undefined,
      sort_by: merged.sort_by,
      sort_dir: merged.sort_dir,
      offset: merged.offset,
      limit: merged.limit,
    };
  }

  it("sends query as undefined when empty", () => {
    const params = buildParams({ query: "" });
    expect(params.query).toBeUndefined();
  });

  it("sends query when non-empty", () => {
    const params = buildParams({ query: "doom" });
    expect(params.query).toBe("doom");
  });

  it("sends content_type as undefined when empty string", () => {
    const params = buildParams({ content_type: "" });
    expect(params.content_type).toBeUndefined();
  });

  it("sends content_type when set", () => {
    const params = buildParams({ content_type: "Magazine" });
    expect(params.content_type).toBe("Magazine");
  });

  it("sends genre filter when set", () => {
    const params = buildParams({ genre: "Action" });
    expect(params.genre).toBe("Action");
  });

  it("sends year filter when set", () => {
    const params = buildParams({ year: 1993 });
    expect(params.year).toBe(1993);
  });

  it("does not send year when null", () => {
    const params = buildParams({ year: null });
    expect(params.year).toBeUndefined();
  });

  it("sends favorites_only as undefined when false", () => {
    const params = buildParams({ favorites_only: false });
    expect(params.favorites_only).toBeUndefined();
  });

  it("sends favorites_only: true when enabled", () => {
    const params = buildParams({ favorites_only: true });
    expect(params.favorites_only).toBe(true);
  });

  it("preserves sort_by and sort_dir", () => {
    const params = buildParams({ sort_by: "year", sort_dir: "desc" });
    expect(params.sort_by).toBe("year");
    expect(params.sort_dir).toBe("desc");
  });

  it("preserves pagination params", () => {
    const params = buildParams({ offset: 200, limit: 100 });
    expect(params.offset).toBe(200);
    expect(params.limit).toBe(100);
  });
});

describe("sort toggle logic", () => {
  it("toggles sort direction when same column clicked", () => {
    let sortBy = "title";
    let sortDir = "asc";

    const handleSort = (col: string) => {
      if (sortBy === col) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortBy = col;
        sortDir = "asc";
      }
    };

    handleSort("title");
    expect(sortDir).toBe("desc");

    handleSort("title");
    expect(sortDir).toBe("asc");
  });

  it("resets to asc when switching to a different column", () => {
    let sortBy = "title";
    let sortDir = "desc";

    const handleSort = (col: string) => {
      if (sortBy === col) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortBy = col;
        sortDir = "asc";
      }
    };

    handleSort("year");
    expect(sortBy).toBe("year");
    expect(sortDir).toBe("asc");
  });

  it("sort indicator shows up arrow for asc", () => {
    const sortIndicator = (col: string, sortBy: string, sortDir: string) =>
      sortBy === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

    expect(sortIndicator("title", "title", "asc")).toBe(" ▲");
    expect(sortIndicator("title", "title", "desc")).toBe(" ▼");
    expect(sortIndicator("year", "title", "asc")).toBe("");
  });
});
