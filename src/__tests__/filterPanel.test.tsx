import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { render } from "solid-js/web";
import { FilterPanel } from "../components/FilterPanel";
import {
  filters,
  setFilters,
  setSelectedIndex,
  setFilterOptions,
} from "../lib/store";

const mockInvoke = vi.mocked(invoke);

let dispose: (() => void) | undefined;

const MOCK_OPTIONS = {
  content_types: ["Game", "Magazine"],
  genres: ["Action", "RPG", "Puzzle"],
  developers: ["id Software", "Apogee"],
  publishers: ["GT Interactive", "Apogee Software"],
  years: [1990, 1991, 1992, 1993, 1994],
  series: ["Doom"],
  platforms: ["MS-DOS", "Windows 3.x"],
};

function populateFilterOptions(overrides: Partial<typeof MOCK_OPTIONS> = {}) {
  setFilterOptions({ ...MOCK_OPTIONS, ...overrides });
}

function resetFilters() {
  setFilters("contentType", "");
  setFilters("genre", "");
  setFilters("developer", "");
  setFilters("publisher", "");
  setFilters("year", null);
  setFilters("series", "");
  setFilters("platform", "");
  setFilters("favoritesOnly", false);
  setFilters("offset", 0);
  setSelectedIndex(0);
}

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockImplementation(async (cmd) => {
    if (cmd === "search_games") return { games: [], total_count: 0 };
    if (cmd === "get_filter_options") return MOCK_OPTIONS;
    return null;
  });
  resetFilters();
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
});

// ── Platform section (expanded by default) ────────────────────────────────────

describe("FilterPanel platform section", () => {
  it("shows platform section when more than 1 platform exists", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const platformHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Platform")
    );
    expect(platformHeader).not.toBeUndefined();
  });

  it("platform section starts expanded (items visible by default)", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS");
    expect(dosItem).not.toBeUndefined();
  });

  it("hides platform section when only 1 platform exists", () => {
    populateFilterOptions({ platforms: ["MS-DOS"] });
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const platformHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Platform")
    );
    expect(platformHeader).toBeUndefined();
  });

  it("clicking a platform item selects it", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS") as HTMLElement;
    dosItem.click();
    expect(filters.platform).toBe("MS-DOS");
  });

  it("clicking a platform item again deselects it", () => {
    setFilters("platform", "MS-DOS");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS") as HTMLElement;
    dosItem.click();
    expect(filters.platform).toBe("");
  });

  it("single-select: clicking a different platform replaces the selection", () => {
    setFilters("platform", "MS-DOS");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const winItem = Array.from(items).find((i) => i.textContent?.trim() === "Windows 3.x") as HTMLElement;
    winItem.click();
    expect(filters.platform).toBe("Windows 3.x");
  });

  it("active platform item has the active class", () => {
    setFilters("platform", "MS-DOS");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS");
    expect(dosItem?.classList.contains("sidebar__item--active")).toBe(true);
  });

  it("clicking platform section header collapses the platform list", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    let items = document.querySelectorAll(".sidebar__item");
    let dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS");
    expect(dosItem).not.toBeUndefined();

    const headers = document.querySelectorAll(".sidebar__section-header");
    const platformHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Platform")
    ) as HTMLElement;
    platformHeader.click();

    items = document.querySelectorAll(".sidebar__item");
    dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS");
    expect(dosItem).toBeUndefined();
  });

  it("clicking platform resets offset to 0", () => {
    setFilters("offset", 100);
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS") as HTMLElement;
    dosItem.click();
    expect(filters.offset).toBe(0);
  });
});

// ── Genre section ─────────────────────────────────────────────────────────────

describe("FilterPanel genre section", () => {
  it("shows genre section when genres are available", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) => h.textContent?.includes("Genre"));
    expect(genreHeader).not.toBeUndefined();
  });

  it("genre section starts collapsed", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent?.trim() === "Action");
    expect(actionItem).toBeUndefined();
  });

  it("clicking genre section header expands it", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click();

    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent?.trim() === "Action");
    expect(actionItem).not.toBeUndefined();
  });

  it("clicking a genre item selects it", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Genre")) as HTMLElement).click();

    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent?.trim() === "Action") as HTMLElement;
    actionItem.click();

    expect(filters.genre).toBe("Action");
  });

  it("clicking a genre item again deselects it", () => {
    setFilters("genre", "Action");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Genre")) as HTMLElement).click();

    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent?.trim() === "Action") as HTMLElement;
    actionItem.click();

    expect(filters.genre).toBe("");
  });

  it("active genre item has the active class", () => {
    setFilters("genre", "RPG");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Genre")) as HTMLElement).click();

    const items = document.querySelectorAll(".sidebar__item");
    const rpgItem = Array.from(items).find((i) => i.textContent?.trim() === "RPG");
    expect(rpgItem?.classList.contains("sidebar__item--active")).toBe(true);
  });

  it("hides genre section when no genres returned", () => {
    populateFilterOptions({ genres: [] });
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) => h.textContent?.includes("Genre"));
    expect(genreHeader).toBeUndefined();
  });
});

// ── Nested genre subcategories ────────────────────────────────────────────────

describe("FilterPanel genre nested subcategories", () => {
  it("shows flat genre items for genres without '/'", () => {
    populateFilterOptions({ genres: ["Action", "RPG"] });
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Genre")) as HTMLElement).click();

    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent?.trim() === "Action");
    expect(actionItem).not.toBeUndefined();
    expect(actionItem?.classList.contains("sidebar__item--indent")).toBe(false);
  });

  it("shows group header for genres with subcategories", () => {
    populateFilterOptions({ genres: ["Action / Platform", "Action / Arcade"] });
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Genre")) as HTMLElement).click();

    const groupHeaders = document.querySelectorAll(".sidebar__group-header");
    const actionGroup = Array.from(groupHeaders).find((h) =>
      h.textContent?.includes("Action")
    );
    expect(actionGroup).not.toBeUndefined();
  });

  it("subcategory children are hidden until group header is clicked", () => {
    populateFilterOptions({ genres: ["Action / Platform", "Action / Arcade"] });
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Genre")) as HTMLElement).click();

    let items = document.querySelectorAll(".sidebar__item.sidebar__item--indent");
    expect(items).toHaveLength(0);

    const groupHeaders = document.querySelectorAll(".sidebar__group-header");
    (Array.from(groupHeaders).find((h) => h.textContent?.includes("Action")) as HTMLElement).click();

    items = document.querySelectorAll(".sidebar__item.sidebar__item--indent");
    expect(items).toHaveLength(2);
  });

  it("clicking a subcategory item sets the full genre value", () => {
    populateFilterOptions({ genres: ["Action / Platform", "Action / Arcade"] });
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Genre")) as HTMLElement).click();

    const groupHeaders = document.querySelectorAll(".sidebar__group-header");
    (Array.from(groupHeaders).find((h) => h.textContent?.includes("Action")) as HTMLElement).click();

    const items = document.querySelectorAll(".sidebar__item.sidebar__item--indent");
    const platformItem = Array.from(items).find((i) =>
      i.textContent?.trim() === "Platform"
    ) as HTMLElement;
    platformItem.click();

    expect(filters.genre).toBe("Action / Platform");
  });
});

// ── Section header label format ───────────────────────────────────────────────

describe("FilterPanel section header label format", () => {
  it("shows plain 'Platform' when no platform is selected", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const platformHeader = Array.from(headers).find((h) => h.textContent?.includes("Platform"));
    expect(platformHeader?.textContent).not.toContain(":");
    expect(platformHeader?.textContent).toContain("Platform");
  });

  it("shows 'Platform: MS-DOS' when a platform is selected", () => {
    setFilters("platform", "MS-DOS");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const platformHeader = Array.from(headers).find((h) => h.textContent?.includes("Platform"));
    expect(platformHeader?.textContent).toContain("Platform: MS-DOS");
  });
});

// ── Year filter section ────────────────────────────────────────────────────────

describe("FilterPanel year filter", () => {
  it("shows year section when years are available", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const yearHeader = Array.from(headers).find((h) => h.textContent?.includes("Year"));
    expect(yearHeader).not.toBeUndefined();
  });

  it("year section starts collapsed", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const yr1993 = Array.from(items).find((i) => i.textContent?.trim() === "1993");
    expect(yr1993).toBeUndefined();
  });

  it("shows all years when expanded", () => {
    const manyYears = Array.from({ length: 25 }, (_, i) => 1990 + i);
    populateFilterOptions({ years: manyYears });
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Year")) as HTMLElement).click();

    const items = document.querySelectorAll(".sidebar__item");
    const texts = Array.from(items).map((i) => i.textContent?.trim());
    expect(texts).toContain("1990");
    expect(texts).toContain("2014");
  });

  it("clicking a year item selects it", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Year")) as HTMLElement).click();

    const items = document.querySelectorAll(".sidebar__item");
    const yr93 = Array.from(items).find((i) => i.textContent?.trim() === "1993") as HTMLElement;
    yr93.click();
    expect(filters.year).toBe(1993);
  });

  it("clicking the selected year deselects it", () => {
    setFilters("year", 1993);
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Year")) as HTMLElement).click();

    const items = document.querySelectorAll(".sidebar__item");
    const yr93 = Array.from(items).find((i) => i.textContent?.trim() === "1993") as HTMLElement;
    yr93.click();
    expect(filters.year).toBeNull();
  });
});

// ── Developer/Publisher sections ──────────────────────────────────────────────

describe("FilterPanel developer and publisher sections", () => {
  it("shows developer section when developers available", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const devHeader = Array.from(headers).find((h) => h.textContent?.includes("Developer"));
    expect(devHeader).not.toBeUndefined();
  });

  it("developer section starts collapsed", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const idItem = Array.from(items).find((i) => i.textContent?.trim() === "id Software");
    expect(idItem).toBeUndefined();
  });

  it("clicking a developer item selects it", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Developer")) as HTMLElement).click();

    const items = document.querySelectorAll(".sidebar__item");
    (Array.from(items).find((i) => i.textContent?.trim() === "id Software") as HTMLElement).click();
    expect(filters.developer).toBe("id Software");
  });

  it("shows publisher section when publishers available", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const pubHeader = Array.from(headers).find((h) => h.textContent?.includes("Publisher"));
    expect(pubHeader).not.toBeUndefined();
  });

  it("clicking a publisher item selects it", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Publisher")) as HTMLElement).click();

    const items = document.querySelectorAll(".sidebar__item");
    (Array.from(items).find((i) => i.textContent?.trim() === "GT Interactive") as HTMLElement).click();
    expect(filters.publisher).toBe("GT Interactive");
  });
});

// ── Favorites toggle ──────────────────────────────────────────────────────────

describe("FilterPanel favorites toggle", () => {
  it("shows a favorites toggle in the sidebar", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const favHeader = Array.from(headers).find((h) => h.textContent?.includes("Favorites"));
    expect(favHeader).not.toBeUndefined();
  });

  it("clicking favorites toggle enables favoritesOnly", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const favHeader = Array.from(headers).find((h) => h.textContent?.includes("Favorites")) as HTMLElement;
    favHeader.click();
    expect(filters.favoritesOnly).toBe(true);
  });

  it("clicking favorites toggle again disables it", () => {
    setFilters("favoritesOnly", true);
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const favHeader = Array.from(headers).find((h) => h.textContent?.includes("Favorites")) as HTMLElement;
    favHeader.click();
    expect(filters.favoritesOnly).toBe(false);
  });
});

// ── Reset Filters button ───────────────────────────────────────────────────────

describe("FilterPanel Reset Filters button", () => {
  it("is always visible even when no filters are active", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const resetBtn = document.querySelector(".sidebar__reset-btn");
    expect(resetBtn).not.toBeNull();
  });

  it("has disabled class when no filters are active", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const resetBtn = document.querySelector(".sidebar__reset-btn");
    expect(resetBtn?.classList.contains("sidebar__reset-btn--disabled")).toBe(true);
  });

  it("does not have disabled class when a platform is selected", () => {
    setFilters("platform", "MS-DOS");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const resetBtn = document.querySelector(".sidebar__reset-btn");
    expect(resetBtn?.classList.contains("sidebar__reset-btn--disabled")).toBe(false);
  });

  it("does not have disabled class when a genre is selected", () => {
    setFilters("genre", "Action");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const resetBtn = document.querySelector(".sidebar__reset-btn");
    expect(resetBtn?.classList.contains("sidebar__reset-btn--disabled")).toBe(false);
  });

  it("does not have disabled class when favoritesOnly is true", () => {
    setFilters("favoritesOnly", true);
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const resetBtn = document.querySelector(".sidebar__reset-btn");
    expect(resetBtn?.classList.contains("sidebar__reset-btn--disabled")).toBe(false);
  });

  it("clicking Reset Filters clears all filters", () => {
    setFilters("platform", "MS-DOS");
    setFilters("genre", "Action");
    setFilters("developer", "id Software");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const resetBtn = document.querySelector(".sidebar__reset-btn") as HTMLElement;
    resetBtn.click();

    expect(filters.platform).toBe("");
    expect(filters.genre).toBe("");
    expect(filters.developer).toBe("");
  });

  it("clicking Reset Filters resets favoritesOnly to false", () => {
    setFilters("favoritesOnly", true);
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const resetBtn = document.querySelector(".sidebar__reset-btn") as HTMLElement;
    resetBtn.click();

    expect(filters.favoritesOnly).toBe(false);
  });

  it("Reset Filters button gains disabled class after resetting", () => {
    setFilters("platform", "MS-DOS");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const resetBtn = document.querySelector(".sidebar__reset-btn") as HTMLElement;
    resetBtn.click();

    expect(resetBtn.classList.contains("sidebar__reset-btn--disabled")).toBe(true);
  });
});
