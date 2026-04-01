import { Component, For, Show, createSignal, createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import {
  filters,
  setFilters,
  filterOptions,
  fetchFilterOptions,
  setSelectedIndex,
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
    filters.genre !== "" ||
    filters.developer !== "" ||
    filters.publisher !== "" ||
    filters.year != null ||
    filters.series !== "" ||
    filters.platform !== "" ||
    filters.favoritesOnly
  );
}

function resetAllFilters() {
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

  const SectionHdr = (props: { sectionKey: SectionKey; label: string; selected: string | number | null }) => (
    <div
      class="sidebar__section-header"
      onClick={() => setSectionOpen(props.sectionKey, (v) => !v)}
    >
      <span class="sidebar__section-arrow">
        {sectionOpen[props.sectionKey] ? "\u25BC" : "\u25B2"}
      </span>
      {" "}{sectionLabel(props.label, props.selected)}
    </div>
  );

  return (
    <div class="sidebar" tabindex="-1">
      {/* Reset Filters button — always at the very top */}
      <div
        class={`sidebar__reset-btn${hasActiveFilters() ? "" : " sidebar__reset-btn--disabled"}`}
        onClick={() => { if (hasActiveFilters()) resetAllFilters(); }}
      >
        Reset Filters
      </div>

      {/* Favorites toggle */}
      <div
        class={`sidebar__section-header${filters.favoritesOnly ? " sidebar__section-header--active" : ""}`}
        onClick={() => {
          setFilters("favoritesOnly", !filters.favoritesOnly);
          setFilters("offset", 0);
          setSelectedIndex(0);
        }}
      >
        Favorites
      </div>

      {/* Platform section */}
      <Show when={opts().platforms.length > 1}>
        <SectionHdr sectionKey="platform" label="Platform" selected={filters.platform || null} />
        <Show when={sectionOpen.platform}>
          <div class="sidebar__section">
            <For each={opts().platforms}>
              {(p) => (
                <div
                  class={`sidebar__item ${filters.platform === p ? "sidebar__item--active" : ""}`}
                  onClick={() => applyStringFilter("platform", p)}
                >
                  {p}
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* Genre section */}
      <Show when={opts().genres.length > 0}>
        <SectionHdr sectionKey="genre" label="Genre" selected={filters.genre || null} />
        <Show when={sectionOpen.genre}>
          <div class="sidebar__section">
            <For each={genreGroups()}>
              {(group) => (
                <>
                  {group.isFlat ? (
                    <div
                      class={`sidebar__item ${filters.genre === group.parent ? "sidebar__item--active" : ""}`}
                      onClick={() => applyStringFilter("genre", group.parent)}
                    >
                      {group.parent}
                    </div>
                  ) : (
                    <>
                      <div
                        class="sidebar__group-header"
                        onClick={() => toggleGroup(group.parent)}
                      >
                        {expandedGroups().has(group.parent) ? "\u25BC" : "\u25B2"} {group.parent}
                      </div>
                      <Show when={expandedGroups().has(group.parent)}>
                        <For each={group.children}>
                          {(child) => (
                            <div
                              class={`sidebar__item sidebar__item--indent ${filters.genre === child.value ? "sidebar__item--active" : ""}`}
                              onClick={() => applyStringFilter("genre", child.value)}
                            >
                              {child.label}
                            </div>
                          )}
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
        <SectionHdr sectionKey="year" label="Year" selected={filters.year} />
        <Show when={sectionOpen.year}>
          <div class="sidebar__section">
            <For each={opts().years}>
              {(y) => (
                <div
                  class={`sidebar__item ${filters.year === y ? "sidebar__item--active" : ""}`}
                  onClick={() => applyYearFilter(y)}
                >
                  {y}
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* Developer section */}
      <Show when={opts().developers.length > 0}>
        <SectionHdr sectionKey="developer" label="Developer" selected={filters.developer || null} />
        <Show when={sectionOpen.developer}>
          <div class="sidebar__section">
            <For each={opts().developers}>
              {(d) => (
                <div
                  class={`sidebar__item ${filters.developer === d ? "sidebar__item--active" : ""}`}
                  onClick={() => applyStringFilter("developer", d)}
                >
                  {d}
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* Publisher section */}
      <Show when={opts().publishers.length > 0}>
        <SectionHdr sectionKey="publisher" label="Publisher" selected={filters.publisher || null} />
        <Show when={sectionOpen.publisher}>
          <div class="sidebar__section">
            <For each={opts().publishers}>
              {(p) => (
                <div
                  class={`sidebar__item ${filters.publisher === p ? "sidebar__item--active" : ""}`}
                  onClick={() => applyStringFilter("publisher", p)}
                >
                  {p}
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* Series section */}
      <Show when={opts().series.length > 0}>
        <SectionHdr sectionKey="series" label="Series" selected={filters.series || null} />
        <Show when={sectionOpen.series}>
          <div class="sidebar__section">
            <For each={opts().series}>
              {(s) => (
                <div
                  class={`sidebar__item ${filters.series === s ? "sidebar__item--active" : ""}`}
                  onClick={() => applyStringFilter("series", s)}
                >
                  {s}
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};
