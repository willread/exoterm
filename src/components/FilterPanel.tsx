import { Component, For, Show, createSignal, createEffect, createMemo, onMount, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import {
  filters,
  setFilters,
  filterOptions,
  fetchFilterOptions,
  setSelectedIndex,
  activePanel,
  searchQuery,
} from "../lib/store";

// ── Genre tree building ──────────────────────────────────────────────────────
type GenreChild = { label: string; value: string };
type GenreGroup = { parent: string; children: GenreChild[]; isFlat: boolean };

function buildGenreGroups(genres: string[]): GenreGroup[] {
  const map = new Map<string, GenreChild[]>();
  for (const g of genres) {
    const slashIdx = g.indexOf(" / ");
    const parent = slashIdx >= 0 ? g.slice(0, slashIdx) : g;
    const label = slashIdx >= 0 ? g.slice(slashIdx + 3) : g;
    if (!map.has(parent)) map.set(parent, []);
    map.get(parent)!.push({ label, value: g });
  }
  return Array.from(map.entries()).map(([parent, children]) => ({
    parent,
    children,
    isFlat: children.length === 1 && children[0].value === parent,
  }));
}

// ── Section header label ─────────────────────────────────────────────────────
function sectionLabel(name: string, selected: string | number | null): string {
  if (!selected && selected !== 0) return name;
  return `${name}: ${selected}`;
}

// ── Any filters active? ──────────────────────────────────────────────────────
function hasActiveFilters(): boolean {
  return (
    searchQuery() !== "" ||
    filters.genre !== "" ||
    filters.developer !== "" ||
    filters.publisher !== "" ||
    filters.year != null ||
    filters.series !== "" ||
    filters.platform !== "" ||
    filters.favoritesOnly ||
    filters.hasExtras ||
    filters.installedOnly
  );
}

function resetAllFilters() {
  (window as any).__clearSearch?.();
  setFilters("genre", "");
  setFilters("developer", "");
  setFilters("publisher", "");
  setFilters("year", null);
  setFilters("series", "");
  setFilters("platform", "");
  setFilters("favoritesOnly", false);
  setFilters("hasExtras", false);
  setFilters("installedOnly", false);
  setFilters("offset", 0);
  setSelectedIndex(0);
}

// Single-select: clicking the active item deselects; clicking another selects it.
function applyStringFilter(
  field: "genre" | "developer" | "publisher" | "series" | "platform",
  value: string
) {
  setFilters(field, filters[field] === value ? "" : value);
  setFilters("offset", 0);
  setSelectedIndex(0);
}

function applyYearFilter(value: number) {
  setFilters("year", filters.year === value ? null : value);
  setFilters("offset", 0);
  setSelectedIndex(0);
}

type SectionKey = "platform" | "genre" | "year" | "developer" | "publisher" | "series";

// ── Navigable item types ─────────────────────────────────────────────────────
type NavItem =
  | { type: "reset" }
  | { type: "favorites" }
  | { type: "has-extras" }
  | { type: "installed" }
  | { type: "section-header"; key: SectionKey; label: string; selected: string | number | null }
  | { type: "item"; field: "genre" | "developer" | "publisher" | "series" | "platform"; value: string; label: string }
  | { type: "year-item"; value: number }
  | { type: "genre-group"; parent: string };

// ── Main component ────────────────────────────────────────────────────────────
export const FilterPanel: Component = () => {
  const [sectionOpen, setSectionOpen] = createStore<Record<SectionKey, boolean>>({
    platform: true,
    genre: false,
    year: false,
    developer: false,
    publisher: false,
    series: false,
  });

  const [expandedGroups, setExpandedGroups] = createSignal<Set<string>>(new Set());

  const toggleGroup = (parent: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(parent)) next.delete(parent);
      else next.add(parent);
      return next;
    });
  };

  // When collapsed the filter stays in place so the header keeps showing the selection.
  // Opening a top-level section does NOT auto-select — user must click an item.
  const toggleSection = (key: SectionKey) => {
    setSectionOpen(key, !sectionOpen[key]);
  };

  // Fetch filter options whenever any filter changes (cascading)
  createEffect(() => {
    const _ct = filters.contentType;
    const _g = filters.genre;
    const _d = filters.developer;
    const _p = filters.publisher;
    const _y = filters.year;
    const _se = filters.series;
    const _pl = filters.platform;
    const _f = filters.favoritesOnly;
    fetchFilterOptions();
  });

  const opts = () =>
    filterOptions() ?? {
      content_types: [],
      genres: [],
      developers: [],
      publishers: [],
      years: [],
      series: [],
      platforms: [],
    };

  const genreGroups = () => buildGenreGroups(opts().genres);

  // Sidebar cursor index
  const [sidebarIndex, setSidebarIndex] = createSignal(0);

  // Build flat list of navigable items
  const navItems = createMemo((): NavItem[] => {
    const items: NavItem[] = [];
    const o = opts();

    items.push({ type: "reset" });
    items.push({ type: "favorites" });
    items.push({ type: "has-extras" });
    items.push({ type: "installed" });

    if (o.platforms.length > 1) {
      items.push({ type: "section-header", key: "platform", label: "Platform", selected: filters.platform || null });
      if (sectionOpen.platform) {
        for (const p of o.platforms) {
          items.push({ type: "item", field: "platform", value: p, label: p });
        }
      }
    }

    if (o.genres.length > 0) {
      items.push({ type: "section-header", key: "genre", label: "Genre", selected: filters.genre || null });
      if (sectionOpen.genre) {
        for (const group of genreGroups()) {
          if (group.isFlat) {
            items.push({ type: "item", field: "genre", value: group.parent, label: group.parent });
          } else {
            items.push({ type: "genre-group", parent: group.parent });
            if (expandedGroups().has(group.parent)) {
              for (const child of group.children) {
                items.push({ type: "item", field: "genre", value: child.value, label: child.label });
              }
            }
          }
        }
      }
    }

    if (o.years.length > 0) {
      items.push({ type: "section-header", key: "year", label: "Year", selected: filters.year });
      if (sectionOpen.year) {
        for (const y of o.years) {
          items.push({ type: "year-item", value: y });
        }
      }
    }

    if (o.developers.length > 0) {
      items.push({ type: "section-header", key: "developer", label: "Developer", selected: filters.developer || null });
      if (sectionOpen.developer) {
        for (const d of o.developers) {
          items.push({ type: "item", field: "developer", value: d, label: d });
        }
      }
    }

    if (o.publishers.length > 0) {
      items.push({ type: "section-header", key: "publisher", label: "Publisher", selected: filters.publisher || null });
      if (sectionOpen.publisher) {
        for (const p of o.publishers) {
          items.push({ type: "item", field: "publisher", value: p, label: p });
        }
      }
    }

    if (o.series.length > 0) {
      items.push({ type: "section-header", key: "series", label: "Series", selected: filters.series || null });
      if (sectionOpen.series) {
        for (const s of o.series) {
          items.push({ type: "item", field: "series", value: s, label: s });
        }
      }
    }

    return items;
  });

  // Clamp sidebar index when nav items change
  createEffect(() => {
    const max = navItems().length - 1;
    if (sidebarIndex() > max) setSidebarIndex(Math.max(0, max));
  });

  // Scroll focused item into view using manual scrollTop
  let sidebarRef: HTMLDivElement | undefined;
  createEffect(() => {
    if (activePanel() !== "sidebar") return;
    const idx = sidebarIndex();
    const el = sidebarRef?.querySelector(`[data-sidebar-idx="${idx}"]`) as HTMLElement | null;
    if (!el || !sidebarRef) return;
    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const viewTop = sidebarRef.scrollTop;
    const viewBottom = viewTop + sidebarRef.clientHeight;
    if (elTop < viewTop) {
      sidebarRef.scrollTop = elTop;
    } else if (elBottom > viewBottom) {
      sidebarRef.scrollTop = elBottom - sidebarRef.clientHeight;
    }
  });

  // Execute action for the current nav item
  const activateItem = (item: NavItem) => {
    switch (item.type) {
      case "reset":
        if (hasActiveFilters()) resetAllFilters();
        break;
      case "favorites":
        setFilters("favoritesOnly", !filters.favoritesOnly);
        setFilters("offset", 0);
        setSelectedIndex(0);
        break;
      case "has-extras":
        setFilters("hasExtras", !filters.hasExtras);
        setFilters("offset", 0);
        setSelectedIndex(0);
        break;
      case "installed":
        setFilters("installedOnly", !filters.installedOnly);
        setFilters("offset", 0);
        setSelectedIndex(0);
        break;
      case "section-header":
        toggleSection(item.key);
        break;
      case "item":
        applyStringFilter(item.field, item.value);
        break;
      case "year-item":
        applyYearFilter(item.value);
        break;
      case "genre-group":
        toggleGroup(item.parent);
        break;
    }
  };

  // Expose navigation helpers on window for App.tsx keyboard handler
  onMount(() => {
    (window as any).__sidebarNav = {
      moveUp: () => setSidebarIndex((i) => Math.max(0, i - 1)),
      moveDown: () => setSidebarIndex((i) => Math.min(navItems().length - 1, i + 1)),
      pageUp: () => setSidebarIndex((i) => Math.max(0, i - 20)),
      pageDown: () => setSidebarIndex((i) => Math.min(navItems().length - 1, i + 20)),
      home: () => setSidebarIndex(0),
      end: () => setSidebarIndex(navItems().length - 1),
      activate: () => {
        const item = navItems()[sidebarIndex()];
        if (item) activateItem(item);
      },
    };
  });
  onCleanup(() => { delete (window as any).__sidebarNav; });

  const isFocused = (idx: number) => activePanel() === "sidebar" && sidebarIndex() === idx;

  return (
    <div class="sidebar" tabindex="-1" ref={sidebarRef}>
      {/* Reset Filters button */}
      <div
        class={`sidebar__reset-btn${hasActiveFilters() ? "" : " sidebar__reset-btn--disabled"}${isFocused(0) ? " sidebar__item--focused" : ""}`}
        data-sidebar-idx={0}
        onClick={() => { if (hasActiveFilters()) resetAllFilters(); }}
      >
        Reset Filters
      </div>

      {/* Favorites toggle */}
      <div
        class={`sidebar__section-header${filters.favoritesOnly ? " sidebar__section-header--active" : ""}${isFocused(1) ? " sidebar__item--focused" : ""}`}
        data-sidebar-idx={1}
        onClick={() => {
          setFilters("favoritesOnly", !filters.favoritesOnly);
          setFilters("offset", 0);
          setSelectedIndex(0);
        }}
      >
        Favorites
      </div>

      {/* Has Extras toggle */}
      <div
        class={`sidebar__section-header${filters.hasExtras ? " sidebar__section-header--active" : ""}${isFocused(2) ? " sidebar__item--focused" : ""}`}
        data-sidebar-idx={2}
        onClick={() => {
          setFilters("hasExtras", !filters.hasExtras);
          setFilters("offset", 0);
          setSelectedIndex(0);
        }}
      >
        Has Extras
      </div>

      {/* Installed toggle */}
      <div
        class={`sidebar__section-header${filters.installedOnly ? " sidebar__section-header--active" : ""}${isFocused(3) ? " sidebar__item--focused" : ""}`}
        data-sidebar-idx={3}
        onClick={() => {
          setFilters("installedOnly", !filters.installedOnly);
          setFilters("offset", 0);
          setSelectedIndex(0);
        }}
      >
        Installed
      </div>

      {/* Platform section */}
      <Show when={opts().platforms.length > 1}>
        <SectionHdrFocused
          sectionKey="platform"
          label="Platform"
          selected={filters.platform || null}
          sectionOpen={sectionOpen}
          onToggle={toggleSection}
          navItems={navItems}
          sidebarIndex={sidebarIndex}
          activePanel={activePanel}
        />
        <Show when={sectionOpen.platform}>
          <div class="sidebar__section">
            <For each={opts().platforms}>
              {(p) => {
                const idx = createMemo(() => navItems().findIndex(
                  (n) => n.type === "item" && n.field === "platform" && n.value === p
                ));
                return (
                  <div
                    class={`sidebar__item ${filters.platform === p ? "sidebar__item--active" : ""}${isFocused(idx()) ? " sidebar__item--focused" : ""}`}
                    data-sidebar-idx={idx()}
                    onClick={() => applyStringFilter("platform", p)}
                  >
                    {p}
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </Show>

      {/* Genre section */}
      <Show when={opts().genres.length > 0}>
        <SectionHdrFocused
          sectionKey="genre"
          label="Genre"
          selected={filters.genre || null}
          sectionOpen={sectionOpen}
          onToggle={toggleSection}
          navItems={navItems}
          sidebarIndex={sidebarIndex}
          activePanel={activePanel}
        />
        <Show when={sectionOpen.genre}>
          <div class="sidebar__section">
            <For each={genreGroups()}>
              {(group) => (
                <>
                  {group.isFlat ? (
                    (() => {
                      const idx = createMemo(() => navItems().findIndex(
                        (n) => n.type === "item" && n.field === "genre" && n.value === group.parent
                      ));
                      return (
                        <div
                          class={`sidebar__item ${filters.genre === group.parent ? "sidebar__item--active" : ""}${isFocused(idx()) ? " sidebar__item--focused" : ""}`}
                          data-sidebar-idx={idx()}
                          onClick={() => applyStringFilter("genre", group.parent)}
                        >
                          {group.parent}
                        </div>
                      );
                    })()
                  ) : (
                    <>
                      {(() => {
                        const idx = createMemo(() => navItems().findIndex(
                          (n) => n.type === "genre-group" && n.parent === group.parent
                        ));
                        return (
                          <div
                            class={`sidebar__group-header${isFocused(idx()) ? " sidebar__item--focused" : ""}`}
                            data-sidebar-idx={idx()}
                            onClick={() => toggleGroup(group.parent)}
                          >
                            {expandedGroups().has(group.parent) ? "\u25BC" : "\u25B2"} {group.parent}
                          </div>
                        );
                      })()}
                      <Show when={expandedGroups().has(group.parent)}>
                        <For each={group.children}>
                          {(child) => {
                            const idx = createMemo(() => navItems().findIndex(
                              (n) => n.type === "item" && n.field === "genre" && n.value === child.value
                            ));
                            return (
                              <div
                                class={`sidebar__item sidebar__item--indent ${filters.genre === child.value ? "sidebar__item--active" : ""}${isFocused(idx()) ? " sidebar__item--focused" : ""}`}
                                data-sidebar-idx={idx()}
                                onClick={() => applyStringFilter("genre", child.value)}
                              >
                                {child.label}
                              </div>
                            );
                          }}
                        </For>
                      </Show>
                    </>
                  )}
                </>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* Year section */}
      <Show when={opts().years.length > 0}>
        <SectionHdrFocused
          sectionKey="year"
          label="Year"
          selected={filters.year}
          sectionOpen={sectionOpen}
          onToggle={toggleSection}
          navItems={navItems}
          sidebarIndex={sidebarIndex}
          activePanel={activePanel}
        />
        <Show when={sectionOpen.year}>
          <div class="sidebar__section">
            <For each={opts().years}>
              {(y) => {
                const idx = createMemo(() => navItems().findIndex(
                  (n) => n.type === "year-item" && n.value === y
                ));
                return (
                  <div
                    class={`sidebar__item ${filters.year === y ? "sidebar__item--active" : ""}${isFocused(idx()) ? " sidebar__item--focused" : ""}`}
                    data-sidebar-idx={idx()}
                    onClick={() => applyYearFilter(y)}
                  >
                    {y}
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </Show>

      {/* Developer section */}
      <Show when={opts().developers.length > 0}>
        <SectionHdrFocused
          sectionKey="developer"
          label="Developer"
          selected={filters.developer || null}
          sectionOpen={sectionOpen}
          onToggle={toggleSection}
          navItems={navItems}
          sidebarIndex={sidebarIndex}
          activePanel={activePanel}
        />
        <Show when={sectionOpen.developer}>
          <div class="sidebar__section">
            <For each={opts().developers}>
              {(d) => {
                const idx = createMemo(() => navItems().findIndex(
                  (n) => n.type === "item" && n.field === "developer" && n.value === d
                ));
                return (
                  <div
                    class={`sidebar__item ${filters.developer === d ? "sidebar__item--active" : ""}${isFocused(idx()) ? " sidebar__item--focused" : ""}`}
                    data-sidebar-idx={idx()}
                    onClick={() => applyStringFilter("developer", d)}
                  >
                    {d}
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </Show>

      {/* Publisher section */}
      <Show when={opts().publishers.length > 0}>
        <SectionHdrFocused
          sectionKey="publisher"
          label="Publisher"
          selected={filters.publisher || null}
          sectionOpen={sectionOpen}
          onToggle={toggleSection}
          navItems={navItems}
          sidebarIndex={sidebarIndex}
          activePanel={activePanel}
        />
        <Show when={sectionOpen.publisher}>
          <div class="sidebar__section">
            <For each={opts().publishers}>
              {(p) => {
                const idx = createMemo(() => navItems().findIndex(
                  (n) => n.type === "item" && n.field === "publisher" && n.value === p
                ));
                return (
                  <div
                    class={`sidebar__item ${filters.publisher === p ? "sidebar__item--active" : ""}${isFocused(idx()) ? " sidebar__item--focused" : ""}`}
                    data-sidebar-idx={idx()}
                    onClick={() => applyStringFilter("publisher", p)}
                  >
                    {p}
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </Show>

      {/* Series section */}
      <Show when={opts().series.length > 0}>
        <SectionHdrFocused
          sectionKey="series"
          label="Series"
          selected={filters.series || null}
          sectionOpen={sectionOpen}
          onToggle={toggleSection}
          navItems={navItems}
          sidebarIndex={sidebarIndex}
          activePanel={activePanel}
        />
        <Show when={sectionOpen.series}>
          <div class="sidebar__section">
            <For each={opts().series}>
              {(s) => {
                const idx = createMemo(() => navItems().findIndex(
                  (n) => n.type === "item" && n.field === "series" && n.value === s
                ));
                return (
                  <div
                    class={`sidebar__item ${filters.series === s ? "sidebar__item--active" : ""}${isFocused(idx()) ? " sidebar__item--focused" : ""}`}
                    data-sidebar-idx={idx()}
                    onClick={() => applyStringFilter("series", s)}
                  >
                    {s}
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};

// Helper component for section headers with focus tracking
const SectionHdrFocused = (props: {
  sectionKey: SectionKey;
  label: string;
  selected: string | number | null;
  sectionOpen: Record<SectionKey, boolean>;
  onToggle: (key: SectionKey) => void;
  navItems: () => NavItem[];
  sidebarIndex: () => number;
  activePanel: () => string;
}) => {
  const idx = createMemo(() => props.navItems().findIndex(
    (n) => n.type === "section-header" && n.key === props.sectionKey
  ));
  const isFocused = () => props.activePanel() === "sidebar" && props.sidebarIndex() === idx();

  return (
    <div
      class={`sidebar__section-header${isFocused() ? " sidebar__item--focused" : ""}`}
      data-sidebar-idx={idx()}
      onClick={() => props.onToggle(props.sectionKey)}
    >
      <span class="sidebar__section-arrow">
        {props.sectionOpen[props.sectionKey] ? "\u25BC" : "\u25B2"}
      </span>
      {" "}{sectionLabel(props.label, props.selected)}
    </div>
  );
};
