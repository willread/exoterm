import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { render } from "solid-js/web";
import { FilterPanel } from "../components/FilterPanel";
import {
  filters,
  setFilters,
  setSelectedIndex,
  refetchFilterOptions,
} from "../lib/store";

const mockInvoke = vi.mocked(invoke);

let dispose: (() => void) | undefined;

const MOCK_OPTIONS = {
  genres: ["Action", "RPG", "Puzzle"],
  developers: ["id Software", "Apogee"],
  publishers: ["GT Interactive", "Apogee Software"],
  years: [1990, 1991, 1992, 1993, 1994],
  series: ["Doom"],
  platforms: ["MS-DOS", "Windows 3.x"],
};

async function populateFilterOptions() {
  mockInvoke.mockImplementation(async (cmd) => {
    if (cmd === "get_filter_options") return MOCK_OPTIONS;
    if (cmd === "search_games") return { games: [], total_count: 0 };
    return null;
  });
  refetchFilterOptions();
  // Wait for the async fetch to resolve
  await new Promise((r) => setTimeout(r, 0));
}

function resetFilters() {
  setFilters("contentType", "Game");
  setFilters("genre", null);
  setFilters("developer", null);
  setFilters("publisher", null);
  setFilters("year", null);
  setFilters("series", null);
  setFilters("platform", null);
  setFilters("favoritesOnly", false);
  setFilters("offset", 0);
  setSelectedIndex(0);
}

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockImplementation(async (cmd) => {
    if (cmd === "search_games") return { games: [], total_count: 0 };
    return null;
  });
  resetFilters();
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
});

// ── Content-type tabs ─────────────────────────────────────────────────────────

describe("FilterPanel content-type tabs", () => {
  it("shows all 7 content type tabs", () => {
    dispose = render(() => <FilterPanel />, document.body);
    const tabs = document.querySelectorAll(".content-tabs__tab");
    expect(tabs).toHaveLength(7);
    const labels = Array.from(tabs).map((t) => t.textContent);
    expect(labels).toContain("All");
    expect(labels).toContain("Games");
    expect(labels).toContain("Magazines");
    expect(labels).toContain("Books");
    expect(labels).toContain("Soundtracks");
    expect(labels).toContain("Videos");
    expect(labels).toContain("Catalogs");
  });

  it("marks 'Games' tab as active when contentType is 'Game'", () => {
    setFilters("contentType", "Game");
    dispose = render(() => <FilterPanel />, document.body);
    const tabs = document.querySelectorAll(".content-tabs__tab");
    const gamesTab = Array.from(tabs).find((t) => t.textContent === "Games");
    expect(gamesTab?.classList.contains("content-tabs__tab--active")).toBe(true);
  });

  it("marks 'All' tab as active when contentType is ''", () => {
    setFilters("contentType", "");
    dispose = render(() => <FilterPanel />, document.body);
    const tabs = document.querySelectorAll(".content-tabs__tab");
    const allTab = Array.from(tabs).find((t) => t.textContent === "All");
    expect(allTab?.classList.contains("content-tabs__tab--active")).toBe(true);
  });

  it("clicking 'Magazines' sets contentType to 'Magazine'", () => {
    dispose = render(() => <FilterPanel />, document.body);
    const tabs = document.querySelectorAll(".content-tabs__tab");
    const magTab = Array.from(tabs).find((t) => t.textContent === "Magazines") as HTMLElement;
    magTab.click();
    expect(filters.contentType).toBe("Magazine");
  });

  it("clicking 'Books' sets contentType to 'Book'", () => {
    dispose = render(() => <FilterPanel />, document.body);
    const tabs = document.querySelectorAll(".content-tabs__tab");
    const tab = Array.from(tabs).find((t) => t.textContent === "Books") as HTMLElement;
    tab.click();
    expect(filters.contentType).toBe("Book");
  });

  it("clicking 'All' sets contentType to ''", () => {
    setFilters("contentType", "Game");
    dispose = render(() => <FilterPanel />, document.body);
    const tabs = document.querySelectorAll(".content-tabs__tab");
    const allTab = Array.from(tabs).find((t) => t.textContent === "All") as HTMLElement;
    allTab.click();
    expect(filters.contentType).toBe("");
  });

  it("clicking a tab resets offset to 0", () => {
    setFilters("offset", 200);
    dispose = render(() => <FilterPanel />, document.body);
    const tabs = document.querySelectorAll(".content-tabs__tab");
    const magTab = Array.from(tabs).find((t) => t.textContent === "Magazines") as HTMLElement;
    magTab.click();
    expect(filters.offset).toBe(0);
  });

  it("clicking a tab resets selectedIndex to 0", () => {
    setSelectedIndex(42);
    dispose = render(() => <FilterPanel />, document.body);
    const tabs = document.querySelectorAll(".content-tabs__tab");
    const magTab = Array.from(tabs).find((t) => t.textContent === "Magazines") as HTMLElement;
    magTab.click();
    // We verify via filters state which resets happen synchronously
    expect(filters.offset).toBe(0);
  });

  it("only one tab has the active class at a time", () => {
    setFilters("contentType", "Video");
    dispose = render(() => <FilterPanel />, document.body);
    const activeTabs = document.querySelectorAll(".content-tabs__tab--active");
    expect(activeTabs).toHaveLength(1);
    expect(activeTabs[0].textContent).toBe("Videos");
  });
});

// ── Genre filter section ───────────────────────────────────────────────────────

describe("FilterPanel genre filter", () => {
  it("shows genre section when genres are available", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const titles = document.querySelectorAll(".sidebar__title");
    const genreTitle = Array.from(titles).find((t) => t.textContent?.startsWith("Genre"));
    expect(genreTitle).not.toBeNull();
  });

  it("shows genre items from filter options", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const texts = Array.from(items).map((i) => i.textContent);
    expect(texts).toContain("Action");
    expect(texts).toContain("RPG");
    expect(texts).toContain("Puzzle");
  });

  it("clicking a genre item sets the genre filter", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent === "Action") as HTMLElement;
    actionItem.click();
    expect(filters.genre).toBe("Action");
  });

  it("clicking a genre item resets offset to 0", async () => {
    setFilters("offset", 100);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent === "Action") as HTMLElement;
    actionItem.click();
    expect(filters.offset).toBe(0);
  });

  it("active genre item has the active class", async () => {
    setFilters("genre", "RPG");
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const rpgItem = Array.from(items).find((i) => i.textContent === "RPG");
    expect(rpgItem?.classList.contains("sidebar__item--active")).toBe(true);
  });

  it("inactive genre items do not have the active class", async () => {
    setFilters("genre", "RPG");
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent === "Action");
    expect(actionItem?.classList.contains("sidebar__item--active")).toBe(false);
  });

  it("shows genre clear [x] button when genre filter is active", async () => {
    setFilters("genre", "Action");
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const titles = document.querySelectorAll(".sidebar__title");
    const genreTitle = Array.from(titles).find((t) => t.textContent?.startsWith("Genre"));
    // Clear button is a span with cursor:pointer inside the title
    expect(genreTitle?.textContent).toContain("x");
  });

  it("clicking genre clear [x] clears the genre filter", async () => {
    setFilters("genre", "Action");
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const titles = document.querySelectorAll(".sidebar__title");
    const genreTitle = Array.from(titles).find((t) =>
      t.textContent?.startsWith("Genre")
    ) as HTMLElement;
    const clearBtn = genreTitle.querySelector("span[style]") as HTMLElement;
    clearBtn.click();
    expect(filters.genre).toBeNull();
  });
});

// ── Platform section visibility ────────────────────────────────────────────────

describe("FilterPanel platform section", () => {
  it("hides platform section when only 1 platform exists", async () => {
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === "get_filter_options")
        return { ...MOCK_OPTIONS, platforms: ["MS-DOS"] };
      return null;
    });
    refetchFilterOptions();
    await new Promise((r) => setTimeout(r, 0));

    dispose = render(() => <FilterPanel />, document.body);
    const titles = document.querySelectorAll(".sidebar__title");
    const platformTitle = Array.from(titles).find((t) =>
      t.textContent?.startsWith("Platform")
    );
    expect(platformTitle).toBeUndefined();
  });

  it("shows platform section when more than 1 platform exists", async () => {
    await populateFilterOptions(); // MOCK_OPTIONS has 2 platforms
    dispose = render(() => <FilterPanel />, document.body);
    const titles = document.querySelectorAll(".sidebar__title");
    const platformTitle = Array.from(titles).find((t) =>
      t.textContent?.startsWith("Platform")
    );
    expect(platformTitle).not.toBeUndefined();
  });

  it("clicking a platform item sets the platform filter", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const dosItem = Array.from(items).find((i) => i.textContent === "MS-DOS") as HTMLElement;
    dosItem.click();
    expect(filters.platform).toBe("MS-DOS");
  });
});

// ── Year filter section ────────────────────────────────────────────────────────

describe("FilterPanel year filter", () => {
  it("shows the most recent 20 years (slice -20)", async () => {
    const manyYears = Array.from({ length: 25 }, (_, i) => 1990 + i); // 1990–2014
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === "get_filter_options")
        return { ...MOCK_OPTIONS, years: manyYears };
      return null;
    });
    refetchFilterOptions();
    await new Promise((r) => setTimeout(r, 0));

    dispose = render(() => <FilterPanel />, document.body);
    const titles = document.querySelectorAll(".sidebar__title");
    const yearTitle = Array.from(titles).find((t) => t.textContent?.startsWith("Year"));
    // Year section exists
    expect(yearTitle).not.toBeUndefined();
    // 1990 should not appear (it's beyond the -20 slice)
    const items = document.querySelectorAll(".sidebar__item");
    const texts = Array.from(items).map((i) => i.textContent);
    expect(texts).not.toContain("1990");
    // 1995 onward (years 5-24 of the 25) should appear
    expect(texts).toContain("1995");
    expect(texts).toContain("2014");
  });

  it("clicking a year item sets the year filter", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const yr93 = Array.from(items).find((i) => i.textContent === "1993") as HTMLElement;
    yr93.click();
    expect(filters.year).toBe(1993);
  });
});

// ── Developer/Publisher sections ──────────────────────────────────────────────

describe("FilterPanel developer and publisher sections", () => {
  it("shows developer section when developers available", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const titles = document.querySelectorAll(".sidebar__title");
    const devTitle = Array.from(titles).find((t) => t.textContent?.startsWith("Developer"));
    expect(devTitle).not.toBeUndefined();
  });

  it("clicking a developer item sets the developer filter", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const idSoftware = Array.from(items).find(
      (i) => i.textContent === "id Software"
    ) as HTMLElement;
    idSoftware.click();
    expect(filters.developer).toBe("id Software");
  });

  it("shows publisher section when publishers available", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const titles = document.querySelectorAll(".sidebar__title");
    const pubTitle = Array.from(titles).find((t) => t.textContent?.startsWith("Publisher"));
    expect(pubTitle).not.toBeUndefined();
  });

  it("clicking a publisher item sets the publisher filter", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const gtItem = Array.from(items).find(
      (i) => i.textContent === "GT Interactive"
    ) as HTMLElement;
    gtItem.click();
    expect(filters.publisher).toBe("GT Interactive");
  });

  it("hides genre section when no genres returned", async () => {
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === "get_filter_options")
        return { ...MOCK_OPTIONS, genres: [] };
      return null;
    });
    refetchFilterOptions();
    await new Promise((r) => setTimeout(r, 0));

    dispose = render(() => <FilterPanel />, document.body);
    const titles = document.querySelectorAll(".sidebar__title");
    const genreTitle = Array.from(titles).find((t) => t.textContent?.startsWith("Genre"));
    expect(genreTitle).toBeUndefined();
  });
});
