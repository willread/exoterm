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

async function populateFilterOptions(overrides: Partial<typeof MOCK_OPTIONS> = {}) {
  mockInvoke.mockImplementation(async (cmd) => {
    if (cmd === "get_filter_options") return { ...MOCK_OPTIONS, ...overrides };
    if (cmd === "search_games") return { games: [], total_count: 0 };
    return null;
  });
  refetchFilterOptions();
  await new Promise((r) => setTimeout(r, 0));
}

function resetFilters() {
  setFilters("contentType", "Game");
  setFilters("genre", []);
  setFilters("developer", []);
  setFilters("publisher", []);
  setFilters("year", []);
  setFilters("series", []);
  setFilters("platform", []);
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

// ── Platform section (expanded by default) ────────────────────────────────────

describe("FilterPanel platform section", () => {
  it("shows platform section when more than 1 platform exists", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const platformHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Platform")
    );
    expect(platformHeader).not.toBeUndefined();
  });

  it("platform section starts expanded (items visible by default)", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS");
    expect(dosItem).not.toBeUndefined();
  });

  it("hides platform section when only 1 platform exists", async () => {
    await populateFilterOptions({ platforms: ["MS-DOS"] });
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const platformHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Platform")
    );
    expect(platformHeader).toBeUndefined();
  });

  it("clicking a platform item adds it to the platform filter array", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS") as HTMLElement;
    dosItem.click();
    expect(filters.platform).toContain("MS-DOS");
  });

  it("clicking a platform item again removes it (toggle)", async () => {
    setFilters("platform", ["MS-DOS"]);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS") as HTMLElement;
    dosItem.click();
    expect(filters.platform).not.toContain("MS-DOS");
  });

  it("multi-selecting platforms adds both to the array", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS") as HTMLElement;
    const winItem = Array.from(items).find((i) => i.textContent?.trim() === "Windows 3.x") as HTMLElement;
    dosItem.click();
    winItem.click();
    expect(filters.platform).toContain("MS-DOS");
    expect(filters.platform).toContain("Windows 3.x");
    expect(filters.platform).toHaveLength(2);
  });

  it("active platform item has the active class", async () => {
    setFilters("platform", ["MS-DOS"]);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS");
    expect(dosItem?.classList.contains("sidebar__item--active")).toBe(true);
  });

  it("clicking platform section header collapses the platform list", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    // Confirm initially expanded
    let items = document.querySelectorAll(".sidebar__item");
    let dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS");
    expect(dosItem).not.toBeUndefined();

    // Click the header to collapse
    const headers = document.querySelectorAll(".sidebar__section-header");
    const platformHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Platform")
    ) as HTMLElement;
    platformHeader.click();

    items = document.querySelectorAll(".sidebar__item");
    dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS");
    expect(dosItem).toBeUndefined();
  });

  it("clicking platform resets offset to 0", async () => {
    setFilters("offset", 100);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const dosItem = Array.from(items).find((i) => i.textContent?.trim() === "MS-DOS") as HTMLElement;
    dosItem.click();
    expect(filters.offset).toBe(0);
  });
});

// ── Genre section ─────────────────────────────────────────────────────────────

describe("FilterPanel genre section", () => {
  it("shows genre section when genres are available", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) => h.textContent?.includes("Genre"));
    expect(genreHeader).not.toBeUndefined();
  });

  it("genre section starts collapsed (items not visible by default)", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    // Check that genre items are NOT in the DOM (section is collapsed)
    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent?.trim() === "Action");
    // Platform items are visible (expanded), but genre items are not
    expect(actionItem).toBeUndefined();
  });

  it("clicking genre section header expands it to show items", async () => {
    await populateFilterOptions();
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

  it("clicking a genre item adds it to the genre filter array", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    // Expand genre section
    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click();

    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent?.trim() === "Action") as HTMLElement;
    actionItem.click();

    expect(filters.genre).toContain("Action");
  });

  it("clicking a genre item again removes it (toggle)", async () => {
    setFilters("genre", ["Action"]);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    // Expand genre section
    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click();

    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent?.trim() === "Action") as HTMLElement;
    actionItem.click();

    expect(filters.genre).not.toContain("Action");
  });

  it("multi-selecting genres adds both to the array", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click();

    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent?.trim() === "Action") as HTMLElement;
    const rpgItem = Array.from(items).find((i) => i.textContent?.trim() === "RPG") as HTMLElement;
    actionItem.click();
    rpgItem.click();

    expect(filters.genre).toContain("Action");
    expect(filters.genre).toContain("RPG");
    expect(filters.genre).toHaveLength(2);
  });

  it("active genre item has the active class", async () => {
    setFilters("genre", ["RPG"]);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    // Expand genre section
    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click();

    const items = document.querySelectorAll(".sidebar__item");
    const rpgItem = Array.from(items).find((i) => i.textContent?.trim() === "RPG");
    expect(rpgItem?.classList.contains("sidebar__item--active")).toBe(true);
  });

  it("hides genre section when no genres returned", async () => {
    await populateFilterOptions({ genres: [] });
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) => h.textContent?.includes("Genre"));
    expect(genreHeader).toBeUndefined();
  });
});

// ── Nested genre subcategories ────────────────────────────────────────────────

describe("FilterPanel genre nested subcategories", () => {
  it("shows flat genre items for genres without '/'", async () => {
    await populateFilterOptions({ genres: ["Action", "RPG"] });
    dispose = render(() => <FilterPanel />, document.body);

    // Expand genre section
    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click();

    const items = document.querySelectorAll(".sidebar__item");
    const actionItem = Array.from(items).find((i) => i.textContent?.trim() === "Action");
    expect(actionItem).not.toBeUndefined();
    // Flat items should NOT have the indent class
    expect(actionItem?.classList.contains("sidebar__item--indent")).toBe(false);
  });

  it("shows group header for genres with subcategories", async () => {
    await populateFilterOptions({ genres: ["Action / Platform", "Action / Arcade"] });
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click();

    // "Action" should appear as a group header, not a sidebar item
    const groupHeaders = document.querySelectorAll(".sidebar__group-header");
    const actionGroup = Array.from(groupHeaders).find((h) =>
      h.textContent?.includes("Action")
    );
    expect(actionGroup).not.toBeUndefined();
  });

  it("subcategory children are hidden until group header is clicked", async () => {
    await populateFilterOptions({ genres: ["Action / Platform", "Action / Arcade"] });
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click();

    // Before expanding the "Action" group, sub-items should not be present
    let items = document.querySelectorAll(".sidebar__item.sidebar__item--indent");
    expect(items).toHaveLength(0);

    // Click the group header to expand
    const groupHeaders = document.querySelectorAll(".sidebar__group-header");
    const actionGroup = Array.from(groupHeaders).find((h) =>
      h.textContent?.includes("Action")
    ) as HTMLElement;
    actionGroup.click();

    items = document.querySelectorAll(".sidebar__item.sidebar__item--indent");
    expect(items).toHaveLength(2);
  });

  it("clicking a subcategory item adds the full genre value to the filter", async () => {
    await populateFilterOptions({ genres: ["Action / Platform", "Action / Arcade"] });
    dispose = render(() => <FilterPanel />, document.body);

    // Expand genre section
    const headers = document.querySelectorAll(".sidebar__section-header");
    const genreHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Genre")
    ) as HTMLElement;
    genreHeader.click();

    // Expand "Action" group
    const groupHeaders = document.querySelectorAll(".sidebar__group-header");
    const actionGroup = Array.from(groupHeaders).find((h) =>
      h.textContent?.includes("Action")
    ) as HTMLElement;
    actionGroup.click();

    // Click "Platform" child
    const items = document.querySelectorAll(".sidebar__item.sidebar__item--indent");
    const platformItem = Array.from(items).find((i) =>
      i.textContent?.trim() === "Platform"
    ) as HTMLElement;
    platformItem.click();

    // The full value "Action / Platform" should be in the genre filter
    expect(filters.genre).toContain("Action / Platform");
  });
});

// ── Section header label format ───────────────────────────────────────────────

describe("FilterPanel section header label format", () => {
  it("shows plain 'Platform' when no platform is selected", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const platformHeader = Array.from(headers).find((h) => h.textContent?.includes("Platform"));
    // Should NOT contain a colon (no selection)
    expect(platformHeader?.textContent).not.toContain(":");
    expect(platformHeader?.textContent).toContain("Platform");
  });

  it("shows 'Platform: MS-DOS' when one platform is selected", async () => {
    setFilters("platform", ["MS-DOS"]);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const platformHeader = Array.from(headers).find((h) => h.textContent?.includes("Platform"));
    expect(platformHeader?.textContent).toContain("Platform: MS-DOS");
  });

  it("shows multiple selected values in the header", async () => {
    setFilters("platform", ["MS-DOS", "Windows 3.x"]);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const platformHeader = Array.from(headers).find((h) => h.textContent?.includes("Platform"));
    expect(platformHeader?.textContent).toContain("MS-DOS");
    expect(platformHeader?.textContent).toContain("Windows 3.x");
  });
});

// ── Year filter section ────────────────────────────────────────────────────────

describe("FilterPanel year filter", () => {
  it("shows year section when years are available", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const yearHeader = Array.from(headers).find((h) => h.textContent?.includes("Year"));
    expect(yearHeader).not.toBeUndefined();
  });

  it("year section starts collapsed", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    // Year items should not be visible (collapsed by default)
    const items = document.querySelectorAll(".sidebar__item");
    const yr1993 = Array.from(items).find((i) => i.textContent?.trim() === "1993");
    expect(yr1993).toBeUndefined();
  });

  it("shows all years when expanded (no slice limit)", async () => {
    const manyYears = Array.from({ length: 25 }, (_, i) => 1990 + i);
    await populateFilterOptions({ years: manyYears });
    dispose = render(() => <FilterPanel />, document.body);

    // Expand year section
    const headers = document.querySelectorAll(".sidebar__section-header");
    const yearHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Year")
    ) as HTMLElement;
    yearHeader.click();

    const items = document.querySelectorAll(".sidebar__item");
    const texts = Array.from(items).map((i) => i.textContent?.trim());
    // All 25 years should be present (no slice limit)
    expect(texts).toContain("1990");
    expect(texts).toContain("2014");
  });

  it("clicking a year item adds it to the year filter array", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    const yearHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Year")
    ) as HTMLElement;
    yearHeader.click();

    const items = document.querySelectorAll(".sidebar__item");
    const yr93 = Array.from(items).find((i) => i.textContent?.trim() === "1993") as HTMLElement;
    yr93.click();
    expect(filters.year).toContain(1993);
  });

  it("multi-selecting years adds both to the array", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    const yearHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Year")
    ) as HTMLElement;
    yearHeader.click();

    const items = document.querySelectorAll(".sidebar__item");
    const yr93 = Array.from(items).find((i) => i.textContent?.trim() === "1993") as HTMLElement;
    const yr94 = Array.from(items).find((i) => i.textContent?.trim() === "1994") as HTMLElement;
    yr93.click();
    yr94.click();
    expect(filters.year).toContain(1993);
    expect(filters.year).toContain(1994);
    expect(filters.year).toHaveLength(2);
  });
});

// ── Developer/Publisher sections ──────────────────────────────────────────────

describe("FilterPanel developer and publisher sections", () => {
  it("shows developer section when developers available", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const devHeader = Array.from(headers).find((h) => h.textContent?.includes("Developer"));
    expect(devHeader).not.toBeUndefined();
  });

  it("developer section starts collapsed", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const items = document.querySelectorAll(".sidebar__item");
    const idItem = Array.from(items).find((i) => i.textContent?.trim() === "id Software");
    expect(idItem).toBeUndefined();
  });

  it("clicking a developer item adds it to the developer filter array", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    const devHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Developer")
    ) as HTMLElement;
    devHeader.click();

    const items = document.querySelectorAll(".sidebar__item");
    const idSoftware = Array.from(items).find(
      (i) => i.textContent?.trim() === "id Software"
    ) as HTMLElement;
    idSoftware.click();
    expect(filters.developer).toContain("id Software");
  });

  it("shows publisher section when publishers available", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const headers = document.querySelectorAll(".sidebar__section-header");
    const pubHeader = Array.from(headers).find((h) => h.textContent?.includes("Publisher"));
    expect(pubHeader).not.toBeUndefined();
  });

  it("clicking a publisher item adds it to the publisher filter array", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const headers = document.querySelectorAll(".sidebar__section-header");
    const pubHeader = Array.from(headers).find((h) =>
      h.textContent?.includes("Publisher")
    ) as HTMLElement;
    pubHeader.click();

    const items = document.querySelectorAll(".sidebar__item");
    const gtItem = Array.from(items).find(
      (i) => i.textContent?.trim() === "GT Interactive"
    ) as HTMLElement;
    gtItem.click();
    expect(filters.publisher).toContain("GT Interactive");
  });
});

// ── Reset Filters button ───────────────────────────────────────────────────────

describe("FilterPanel Reset Filters button", () => {
  it("does not show Reset Filters when no filters are active", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const resetBtn = document.querySelector(".sidebar__reset-btn");
    expect(resetBtn).toBeNull();
  });

  it("shows Reset Filters when a platform is selected", async () => {
    setFilters("platform", ["MS-DOS"]);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const resetBtn = document.querySelector(".sidebar__reset-btn");
    expect(resetBtn).not.toBeNull();
  });

  it("shows Reset Filters when a genre is selected", async () => {
    setFilters("genre", ["Action"]);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const resetBtn = document.querySelector(".sidebar__reset-btn");
    expect(resetBtn).not.toBeNull();
  });

  it("shows Reset Filters when favoritesOnly is true", async () => {
    setFilters("favoritesOnly", true);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const resetBtn = document.querySelector(".sidebar__reset-btn");
    expect(resetBtn).not.toBeNull();
  });

  it("clicking Reset Filters clears all filter arrays", async () => {
    setFilters("platform", ["MS-DOS"]);
    setFilters("genre", ["Action"]);
    setFilters("developer", ["id Software"]);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const resetBtn = document.querySelector(".sidebar__reset-btn") as HTMLElement;
    resetBtn.click();

    expect(filters.platform).toHaveLength(0);
    expect(filters.genre).toHaveLength(0);
    expect(filters.developer).toHaveLength(0);
  });

  it("clicking Reset Filters resets favoritesOnly to false", async () => {
    setFilters("favoritesOnly", true);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const resetBtn = document.querySelector(".sidebar__reset-btn") as HTMLElement;
    resetBtn.click();

    expect(filters.favoritesOnly).toBe(false);
  });

  it("Reset Filters button disappears after resetting", async () => {
    setFilters("platform", ["MS-DOS"]);
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);

    const resetBtn = document.querySelector(".sidebar__reset-btn") as HTMLElement;
    resetBtn.click();

    const resetBtnAfter = document.querySelector(".sidebar__reset-btn");
    expect(resetBtnAfter).toBeNull();
  });
});

// ── No content-type tabs ──────────────────────────────────────────────────────

describe("FilterPanel has no content-type tabs", () => {
  it("does not render content-type tabs", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const tabs = document.querySelectorAll(".content-tabs__tab");
    expect(tabs).toHaveLength(0);
  });

  it("does not render the content-tabs container", async () => {
    await populateFilterOptions();
    dispose = render(() => <FilterPanel />, document.body);
    const tabsContainer = document.querySelector(".content-tabs");
    expect(tabsContainer).toBeNull();
  });
});
