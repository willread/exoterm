import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { render } from "solid-js/web";
import { FilterPanel } from "../components/FilterPanel";
import {
  filters,
  setFilters,
  setSelectedIndex,
  setFilterOptions,
  setActivePanel,
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
  setActivePanel("list");
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
  delete (window as any).__sidebarNav;
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
    // Opening the section auto-selects "Action" (first genre); click a different item.

    const items = document.querySelectorAll(".sidebar__item");
    const rpgItem = Array.from(items).find((i) => i.textContent?.trim() === "RPG") as HTMLElement;
    rpgItem.click();

    expect(filters.genre).toBe("RPG");
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

  it("genre group headers have the same CSS classes whether collapsed or expanded", () => {
    // Regression: the group header must not gain or lose any class when toggled.
    // Color is controlled by .sidebar__group-header in CSS (var(--fg-title));
    // adding a conditional class here would re-introduce the greyed-out look.
    populateFilterOptions({ genres: ["Action / Platform", "Action / Arcade"] });
    dispose = render(() => <FilterPanel />, document.body);

    // Expand the Genre section so group headers are rendered
    const genreHeader = Array.from(document.querySelectorAll(".sidebar__section-header")).find(
      (h) => h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click();

    const groupHeader = document.querySelector(".sidebar__group-header") as HTMLElement;
    expect(groupHeader).not.toBeNull();

    // Record classes in collapsed state (▲)
    const classesCollapsed = [...groupHeader.classList].sort();

    // Expand the group (▼)
    groupHeader.click();
    const classesExpanded = [...groupHeader.classList].sort();

    // Must be identical — only the arrow glyph text changes, never CSS classes
    expect(classesExpanded).toEqual(classesCollapsed);
  });

  it("subcategory items carry both sidebar__item and sidebar__item--indent classes", () => {
    // Both classes must be present on the same element so the higher-specificity
    // .sidebar__item.sidebar__item--indent CSS rule (specificity 0,2,0) overrides
    // the later .sidebar__item { padding: 0 1ch } rule (specificity 0,1,0) and the
    // indent padding-left actually takes effect.
    populateFilterOptions({ genres: ["Action / Platform", "Action / Arcade"] });
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Genre")) as HTMLElement).click();

    const groupHeaders = document.querySelectorAll(".sidebar__group-header");
    (Array.from(groupHeaders).find((h) => h.textContent?.includes("Action")) as HTMLElement).click();

    const indentItems = document.querySelectorAll(".sidebar__item.sidebar__item--indent");
    expect(indentItems.length).toBe(2);
    indentItems.forEach((el) => {
      expect(el.classList.contains("sidebar__item")).toBe(true);
      expect(el.classList.contains("sidebar__item--indent")).toBe(true);
    });
  });

  it("clicking a subcategory item sets the full genre value", () => {
    populateFilterOptions({ genres: ["Action / Platform", "Action / Arcade"] });
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    (Array.from(headers).find((h) => h.textContent?.includes("Genre")) as HTMLElement).click();
    // Opening auto-selects the first child "Action / Platform"; click a different child.

    const groupHeaders = document.querySelectorAll(".sidebar__group-header");
    (Array.from(groupHeaders).find((h) => h.textContent?.includes("Action")) as HTMLElement).click();

    const items = document.querySelectorAll(".sidebar__item.sidebar__item--indent");
    const arcadeItem = Array.from(items).find((i) =>
      i.textContent?.trim() === "Arcade"
    ) as HTMLElement;
    arcadeItem.click();

    expect(filters.genre).toBe("Action / Arcade");
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
    // Opening auto-selects the first developer "id Software"; click a different one.

    const items = document.querySelectorAll(".sidebar__item");
    (Array.from(items).find((i) => i.textContent?.trim() === "Apogee") as HTMLElement).click();
    expect(filters.developer).toBe("Apogee");
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
    // Opening auto-selects the first publisher "GT Interactive"; click a different one.

    const items = document.querySelectorAll(".sidebar__item");
    (Array.from(items).find((i) => i.textContent?.trim() === "Apogee Software") as HTMLElement).click();
    expect(filters.publisher).toBe("Apogee Software");
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

// ── Sidebar keyboard navigation ──────────────────────────────────────────────

describe("FilterPanel sidebar keyboard navigation", () => {
  it("exposes __sidebarNav on window after mount", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const nav = (window as any).__sidebarNav;
    expect(nav).toBeDefined();
    expect(typeof nav.moveUp).toBe("function");
    expect(typeof nav.moveDown).toBe("function");
    expect(typeof nav.activate).toBe("function");
    expect(typeof nav.pageUp).toBe("function");
    expect(typeof nav.pageDown).toBe("function");
    expect(typeof nav.home).toBe("function");
    expect(typeof nav.end).toBe("function");
  });

  it("moveDown advances the focused item", () => {
    setActivePanel("sidebar");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    // Initially index 0 (Reset Filters) is focused
    const resetBtn = document.querySelector("[data-sidebar-idx='0']");
    expect(resetBtn?.classList.contains("sidebar__item--focused")).toBe(true);

    (window as any).__sidebarNav.moveDown();

    // Now index 1 (Favorites) should be focused
    const favItem = document.querySelector("[data-sidebar-idx='1']");
    expect(favItem?.classList.contains("sidebar__item--focused")).toBe(true);
    expect(resetBtn?.classList.contains("sidebar__item--focused")).toBe(false);
  });

  it("moveUp does not go below 0", () => {
    setActivePanel("sidebar");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    (window as any).__sidebarNav.moveUp();

    const resetBtn = document.querySelector("[data-sidebar-idx='0']");
    expect(resetBtn?.classList.contains("sidebar__item--focused")).toBe(true);
  });

  it("activate on a section header toggles expand/collapse", () => {
    setActivePanel("sidebar");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const nav = (window as any).__sidebarNav;

    // Navigate to Platform header (idx 3 — after Reset, Favorites, Has Extras)
    nav.moveDown(); // -> Favorites
    nav.moveDown(); // -> Has Extras
    nav.moveDown(); // -> Platform header

    // Platform starts expanded; activate should collapse it
    let dosItem = Array.from(document.querySelectorAll(".sidebar__item")).find(
      (i) => i.textContent?.trim() === "MS-DOS"
    );
    expect(dosItem).not.toBeUndefined();

    nav.activate();

    dosItem = Array.from(document.querySelectorAll(".sidebar__item")).find(
      (i) => i.textContent?.trim() === "MS-DOS"
    );
    expect(dosItem).toBeUndefined();

    // Activate again should expand
    nav.activate();
    dosItem = Array.from(document.querySelectorAll(".sidebar__item")).find(
      (i) => i.textContent?.trim() === "MS-DOS"
    );
    expect(dosItem).not.toBeUndefined();
  });

  it("activate on a filter item selects it", () => {
    setActivePanel("sidebar");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const nav = (window as any).__sidebarNav;

    // Navigate to first platform item: Reset(0), Favorites(1), Has Extras(2), Platform header(3), MS-DOS(4)
    nav.moveDown();
    nav.moveDown();
    nav.moveDown();
    nav.moveDown();
    nav.activate();

    expect(filters.platform).toBe("MS-DOS");
  });

  it("activate on Favorites toggles favoritesOnly", () => {
    setActivePanel("sidebar");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const nav = (window as any).__sidebarNav;
    nav.moveDown(); // -> Favorites
    nav.activate();

    expect(filters.favoritesOnly).toBe(true);

    nav.activate();
    expect(filters.favoritesOnly).toBe(false);
  });

  it("home jumps to first item, end jumps to last", () => {
    setActivePanel("sidebar");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const nav = (window as any).__sidebarNav;
    nav.end();

    // Last item should be focused
    const allItems = document.querySelectorAll("[data-sidebar-idx]");
    const lastIdx = allItems[allItems.length - 1]?.getAttribute("data-sidebar-idx");
    const lastItem = document.querySelector(`[data-sidebar-idx='${lastIdx}']`);
    expect(lastItem?.classList.contains("sidebar__item--focused")).toBe(true);

    nav.home();
    const firstItem = document.querySelector("[data-sidebar-idx='0']");
    expect(firstItem?.classList.contains("sidebar__item--focused")).toBe(true);
  });

  it("focused class is not applied when activePanel is not sidebar", () => {
    setActivePanel("list");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const resetBtn = document.querySelector("[data-sidebar-idx='0']");
    expect(resetBtn?.classList.contains("sidebar__item--focused")).toBe(false);
  });
});

// ── Section auto-select and clear on collapse ────────────────────────────────

describe("FilterPanel section auto-select and clear on toggle", () => {
  it("opening a collapsed section auto-selects the first item", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const genreHeader = Array.from(document.querySelectorAll(".sidebar__section-header")).find(
      (h) => h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click();

    expect(filters.genre).toBe("Action");
  });

  it("does not override an existing selection when opening a section", () => {
    setFilters("genre", "RPG");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const genreHeader = Array.from(document.querySelectorAll(".sidebar__section-header")).find(
      (h) => h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click();

    expect(filters.genre).toBe("RPG");
  });

  it("collapsing an open section clears its filter", () => {
    setFilters("platform", "Windows 3.x");
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    // Platform starts expanded; click the header to collapse it
    const platformHeader = Array.from(document.querySelectorAll(".sidebar__section-header")).find(
      (h) => h.textContent?.includes("Platform")
    ) as HTMLElement;
    platformHeader.click();

    expect(filters.platform).toBe("");
  });

  it("collapsing a section that was just opened clears the auto-selected filter", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const genreHeader = Array.from(document.querySelectorAll(".sidebar__section-header")).find(
      (h) => h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click(); // open → auto-selects "Action"
    expect(filters.genre).toBe("Action");

    genreHeader.click(); // collapse → clears
    expect(filters.genre).toBe("");
  });

  it("opening a year section auto-selects the first year", () => {
    populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const yearHeader = Array.from(document.querySelectorAll(".sidebar__section-header")).find(
      (h) => h.textContent?.includes("Year")
    ) as HTMLElement;
    yearHeader.click();

    expect(filters.year).toBe(1990);
  });
});
