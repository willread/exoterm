import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { render } from "solid-js/web";
import { GameList } from "../components/GameList";
import {
  setGameList,
  setTotalCount,
  setSelectedIndex,
  setFilters,
  filters,
  setSearchQuery,
} from "../lib/store";

const mockInvoke = vi.mocked(invoke);

let dispose: (() => void) | undefined;

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
  // Prevent fetchGames from clobbering test state by returning empty by default
  mockInvoke.mockImplementation(async (cmd) => {
    if (cmd === "search_games") return { games: [], total_count: 0 };
    return null;
  });
  setGameList([]);
  setTotalCount(0);
  setSelectedIndex(0);
  setSearchQuery("");
  setFilters("contentType", "Game");
  setFilters("genre", "");
  setFilters("developer", "");
  setFilters("publisher", "");
  setFilters("year", null);
  setFilters("series", "");
  setFilters("platform", "");
  setFilters("sortBy", "title");
  setFilters("sortDir", "asc");
  setFilters("offset", 0);
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
});

describe("GameList empty states", () => {
  it("shows 'No games found' prompt when there are no collections scanned", async () => {
    setGameList([]);
    setTotalCount(0);
    dispose = render(() => <GameList />, document.body);
    // Allow the createEffect / fetchGames microtask to settle
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector(".game-list__empty")?.textContent).toContain(
      "No games found"
    );
    expect(document.querySelector(".game-list__empty")?.textContent).toContain(
      "Add a collection"
    );
  });

  it("shows 'No matches.' when there are games but none match the filter", async () => {
    // Simulate: some games exist globally (totalCount > 0) but search returns empty
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === "search_games") return { games: [], total_count: 500 };
      return null;
    });
    // Pre-set totalCount so initial render sees it before the effect fires
    setGameList([]);
    setTotalCount(500);
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector(".game-list__empty")?.textContent).toBe(
      "No matches."
    );
  });
});

describe("GameList rows", () => {
  it("renders a row for each game", async () => {
    const games = [
      makeGame({ id: 1, title: "Doom" }),
      makeGame({ id: 2, title: "Quake" }),
      makeGame({ id: 3, title: "Heretic" }),
    ];
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === "search_games") return { games, total_count: 3 };
      return null;
    });
    setGameList(games);
    setTotalCount(3);
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    await Promise.resolve();
    // Exclude the sticky header row — only count data rows.
    const rows = document.querySelectorAll(".game-list__row:not(.game-list__row--header)");
    expect(rows).toHaveLength(3);
  });

  it("shows game title in the title column", async () => {
    const games = [makeGame({ id: 1, title: "Wolfenstein 3D" })];
    setGameList(games);
    setTotalCount(1);
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    await Promise.resolve();
    // Exclude header row — the header cell also carries game-list__col--title.
    const titleCols = document.querySelectorAll(".game-list__row:not(.game-list__row--header) .game-list__col--title");
    expect(titleCols[0]?.textContent).toBe("Wolfenstein 3D");
  });

  it("marks the selected row with the selected class", async () => {
    const games = [
      makeGame({ id: 1, title: "Doom" }),
      makeGame({ id: 2, title: "Quake" }),
    ];
    setGameList(games);
    setSelectedIndex(1);
    setTotalCount(2);
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    await Promise.resolve();
    // Use data rows only (skip the sticky header row).
    const rows = document.querySelectorAll(".game-list__row:not(.game-list__row--header)");
    expect(rows[0].classList.contains("game-list__row--selected")).toBe(false);
    expect(rows[1].classList.contains("game-list__row--selected")).toBe(true);
  });

  it("shows a star for favorited games", async () => {
    const games = [
      makeGame({ id: 1, title: "Doom", favorite: true }),
      makeGame({ id: 2, title: "Quake", favorite: false }),
    ];
    setGameList(games);
    setTotalCount(2);
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    await Promise.resolve();
    // Exclude the header row — its fav cell contains "*" not a star.
    const favCols = document.querySelectorAll(".game-list__row:not(.game-list__row--header) .game-list__col--fav");
    // Row 0 (Doom) is favorited → ★; row 1 (Quake) is not → empty.
    expect(favCols[0].textContent).toBe("★");
    expect(favCols[1].textContent).toBe("");
  });
});

describe("GameList sort indicators", () => {
  it("shows up-arrow on the active ascending sort column", async () => {
    setFilters("sortBy", "title");
    setFilters("sortDir", "asc");
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    const headerCols = document.querySelectorAll(".game-list__row--header .game-list__col");
    // Title header (index 1 after the fav col) should contain ▲
    const titleHeader = Array.from(headerCols).find((c) =>
      c.textContent?.startsWith("Title")
    );
    expect(titleHeader?.textContent).toContain("▲");
  });

  it("shows down-arrow on the active descending sort column", async () => {
    setFilters("sortBy", "year");
    setFilters("sortDir", "desc");
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    const headerCols = document.querySelectorAll(".game-list__row--header .game-list__col");
    const yearHeader = Array.from(headerCols).find((c) =>
      c.textContent?.startsWith("Year")
    );
    expect(yearHeader?.textContent).toContain("▼");
  });

  it("shows no indicator on inactive sort columns", async () => {
    setFilters("sortBy", "title");
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    const headerCols = document.querySelectorAll(".game-list__row--header .game-list__col");
    const yearHeader = Array.from(headerCols).find((c) =>
      c.textContent?.startsWith("Year")
    );
    expect(yearHeader?.textContent).not.toContain("▲");
    expect(yearHeader?.textContent).not.toContain("▼");
  });

  it("clicking a header column changes sortBy to that column", async () => {
    setFilters("sortBy", "title");
    setFilters("sortDir", "asc");
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();

    const headerCols = document.querySelectorAll(".game-list__row--header .game-list__col");
    const yearHeader = Array.from(headerCols).find((c) =>
      c.textContent?.startsWith("Year")
    ) as HTMLElement;
    yearHeader.click();

    expect(filters.sortBy).toBe("year");
    expect(filters.sortDir).toBe("asc");
  });

  it("clicking the active sort column toggles direction from asc to desc", async () => {
    setFilters("sortBy", "title");
    setFilters("sortDir", "asc");
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();

    const headerCols = document.querySelectorAll(".game-list__row--header .game-list__col");
    const titleHeader = Array.from(headerCols).find((c) =>
      c.textContent?.startsWith("Title")
    ) as HTMLElement;
    titleHeader.click();

    expect(filters.sortBy).toBe("title");
    expect(filters.sortDir).toBe("desc");
  });

  it("clicking the active sort column toggles direction from desc to asc", async () => {
    setFilters("sortBy", "year");
    setFilters("sortDir", "desc");
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();

    const headerCols = document.querySelectorAll(".game-list__row--header .game-list__col");
    const yearHeader = Array.from(headerCols).find((c) =>
      c.textContent?.startsWith("Year")
    ) as HTMLElement;
    yearHeader.click();

    expect(filters.sortBy).toBe("year");
    expect(filters.sortDir).toBe("asc");
  });

  it("clicking a different column resets sort direction to asc", async () => {
    setFilters("sortBy", "title");
    setFilters("sortDir", "desc");
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();

    const headerCols = document.querySelectorAll(".game-list__row--header .game-list__col");
    const devHeader = Array.from(headerCols).find((c) =>
      c.textContent?.startsWith("Developer")
    ) as HTMLElement;
    devHeader.click();

    expect(filters.sortBy).toBe("developer");
    expect(filters.sortDir).toBe("asc");
  });

  it("clicking a sort header resets offset to 0", async () => {
    setFilters("offset", 100);
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();

    const headerCols = document.querySelectorAll(".game-list__row--header .game-list__col");
    const yearHeader = Array.from(headerCols).find((c) =>
      c.textContent?.startsWith("Year")
    ) as HTMLElement;
    yearHeader.click();

    expect(filters.offset).toBe(0);
  });

  it("clicking a sort header triggers a new search_games call with updated sort params", async () => {
    setFilters("sortBy", "title");
    setFilters("sortDir", "asc");
    dispose = render(() => <GameList />, document.body);
    // Let the initial mount effect settle.
    await Promise.resolve();
    await Promise.resolve();
    mockInvoke.mockClear();

    const headerCols = document.querySelectorAll(".game-list__row--header .game-list__col");
    const yearHeader = Array.from(headerCols).find((c) =>
      c.textContent?.startsWith("Year")
    ) as HTMLElement;
    yearHeader.click();

    // Let the reactive effect and async fetch settle.
    await Promise.resolve();
    await Promise.resolve();

    const call = mockInvoke.mock.calls.find(([cmd]) => cmd === "search_games");
    expect(call).toBeDefined();
    expect((call![1] as any).sort_by).toBe("year");
    expect((call![1] as any).sort_dir).toBe("asc");
  });
});

describe("GameList virtual scrolling", () => {
  it("default limit is large enough to show all games without pagination", () => {
    // Ensure no artificial 200-game cap; limit should be >= 10000
    expect(filters.limit).toBeGreaterThanOrEqual(10000);
  });

  it("renders only a virtual window of rows, not all games at once", async () => {
    // 250 games — virtual scrolling should render far fewer DOM rows.
    const games = Array.from({ length: 250 }, (_, i) =>
      makeGame({ id: i + 1, title: `Game ${i + 1}` })
    );
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === "search_games") return { games, total_count: 250 };
      return null;
    });
    setGameList(games);
    setTotalCount(250);
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    await Promise.resolve();
    const rows = document.querySelectorAll(".game-list__row");
    // Virtual scrolling renders a viewport-sized window (< 250), not all rows.
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(250);
  });

  it("renders first games starting from index 0 at initial scroll position", async () => {
    const games = Array.from({ length: 100 }, (_, i) =>
      makeGame({ id: i + 1, title: `Game ${String(i + 1).padStart(3, "0")}` })
    );
    setGameList(games);
    setTotalCount(100);
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    // Skip the sticky header row; data rows use game-list__row without --header modifier.
    const dataRows = document.querySelectorAll(".game-list__row:not(.game-list__row--header)");
    // First rendered data row corresponds to the first game.
    expect(dataRows[0].querySelector(".game-list__col--title")?.textContent).toBe("Game 001");
  });

  it("uses a total-height spacer so the scrollbar reflects all games", async () => {
    const games = Array.from({ length: 500 }, (_, i) =>
      makeGame({ id: i + 1, title: `Game ${i + 1}` })
    );
    setGameList(games);
    setTotalCount(500);
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    const spacer = document.querySelector(".game-list__virtual-spacer") as HTMLElement;
    expect(spacer).not.toBeNull();
    // Spacer height = 500 rows × 16px
    expect(spacer.style.height).toBe("8000px");
  });
});

describe("GameList count footer", () => {
  it("shows position and total when there are games", async () => {
    const games = [makeGame({ id: 1 }), makeGame({ id: 2 })];
    setGameList(games);
    setTotalCount(2);
    setSelectedIndex(0);
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    await Promise.resolve();
    const count = document.querySelector(".game-list__count");
    // Should show "1 / 2" (selectedIndex + 1 / totalCount)
    expect(count?.textContent).toMatch(/1\s*\/\s*2/);
  });

  it("shows nothing in the count footer when there are no games", async () => {
    setGameList([]);
    setTotalCount(0);
    dispose = render(() => <GameList />, document.body);
    await Promise.resolve();
    await Promise.resolve();
    const count = document.querySelector(".game-list__count");
    expect(count?.textContent?.trim()).toBe("");
  });
});
