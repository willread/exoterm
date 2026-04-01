import { describe, it, expect, beforeEach } from "vitest";
import {
  theme,
  setTheme,
  crtEnabled,
  setCrtEnabled,
  fontSize,
  setFontSize,
  sidebarWidth,
  setSidebarWidth,
  detailWidth,
  setDetailWidth,
  filters,
  setFilters,
  getPersistedState,
  restorePersistedState,
} from "../lib/store";

beforeEach(() => {
  setTheme("blue");
  setCrtEnabled(true);
  setFontSize(16);
  setSidebarWidth(200);
  setDetailWidth(320);
  setFilters("sortBy", "title");
  setFilters("sortDir", "asc");
  setFilters("contentType", "");
  setFilters("genre", "");
  setFilters("developer", "");
  setFilters("publisher", "");
  setFilters("year", null);
  setFilters("series", "");
  setFilters("platform", "");
  setFilters("favoritesOnly", false);
});

describe("getPersistedState", () => {
  it("captures all persisted fields with defaults", () => {
    const state = getPersistedState();
    expect(state.theme).toBe("blue");
    expect(state.crtEnabled).toBe(true);
    expect(state.fontSize).toBe(16);
    expect(state.sidebarWidth).toBe(200);
    expect(state.detailWidth).toBe(320);
    expect(state.sortBy).toBe("title");
    expect(state.sortDir).toBe("asc");
    expect(state.contentType).toBe("");
    expect(state.genre).toBe("");
    expect(state.favoritesOnly).toBe(false);
  });

  it("captures modified values", () => {
    setTheme("amber");
    setCrtEnabled(false);
    setFontSize(20);
    setSidebarWidth(300);
    setDetailWidth(400);
    setFilters("sortBy", "year");
    setFilters("sortDir", "desc");
    setFilters("genre", "RPG");
    setFilters("favoritesOnly", true);

    const state = getPersistedState();
    expect(state.theme).toBe("amber");
    expect(state.crtEnabled).toBe(false);
    expect(state.fontSize).toBe(20);
    expect(state.sidebarWidth).toBe(300);
    expect(state.detailWidth).toBe(400);
    expect(state.sortBy).toBe("year");
    expect(state.sortDir).toBe("desc");
    expect(state.genre).toBe("RPG");
    expect(state.favoritesOnly).toBe(true);
  });
});

describe("restorePersistedState", () => {
  it("restores all fields from a saved object", () => {
    restorePersistedState({
      theme: "green",
      crtEnabled: false,
      fontSize: 18,
      sidebarWidth: 250,
      detailWidth: 350,
      sortBy: "developer",
      sortDir: "desc",
      contentType: "Magazine",
      genre: "Action",
      developer: "id Software",
      publisher: "GT Interactive",
      year: 1993,
      series: "Doom",
      platform: "MS-DOS",
      favoritesOnly: true,
    });

    expect(theme()).toBe("green");
    expect(crtEnabled()).toBe(false);
    expect(fontSize()).toBe(18);
    expect(sidebarWidth()).toBe(250);
    expect(detailWidth()).toBe(350);
    expect(filters.sortBy).toBe("developer");
    expect(filters.sortDir).toBe("desc");
    expect(filters.contentType).toBe("Magazine");
    expect(filters.genre).toBe("Action");
    expect(filters.developer).toBe("id Software");
    expect(filters.publisher).toBe("GT Interactive");
    expect(filters.year).toBe(1993);
    expect(filters.series).toBe("Doom");
    expect(filters.platform).toBe("MS-DOS");
    expect(filters.favoritesOnly).toBe(true);
  });

  it("handles partial saved state (only some fields present)", () => {
    restorePersistedState({
      theme: "amber",
      fontSize: 20,
    });

    expect(theme()).toBe("amber");
    expect(fontSize()).toBe(20);
    // Untouched fields remain at defaults
    expect(crtEnabled()).toBe(true);
    expect(sidebarWidth()).toBe(200);
    expect(filters.sortBy).toBe("title");
  });

  it("handles empty saved state gracefully", () => {
    restorePersistedState({});

    expect(theme()).toBe("blue");
    expect(crtEnabled()).toBe(true);
    expect(fontSize()).toBe(16);
  });

  it("round-trips through get/restore", () => {
    setTheme("bw");
    setCrtEnabled(false);
    setFontSize(14);
    setSidebarWidth(180);
    setFilters("genre", "RPG");
    setFilters("year", 1995);

    const saved = getPersistedState();

    // Reset everything
    setTheme("blue");
    setCrtEnabled(true);
    setFontSize(16);
    setSidebarWidth(200);
    setFilters("genre", "");
    setFilters("year", null);

    // Restore
    restorePersistedState(saved);

    expect(theme()).toBe("bw");
    expect(crtEnabled()).toBe(false);
    expect(fontSize()).toBe(14);
    expect(sidebarWidth()).toBe(180);
    expect(filters.genre).toBe("RPG");
    expect(filters.year).toBe(1995);
  });
});
