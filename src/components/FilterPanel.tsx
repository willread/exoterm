import { Component, For, Show, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import {
  filters,
  setFilters,
  filterOptions,
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
    // A "flat" group has exactly one child whose value equals the parent (no "/" in genre)
    isFlat: children.length === 1 && children[0].value === parent,
  }));
}

// ── Multi-select toggle helper ────────────────────────────────────────────────
function toggleItem<T>(current: T[], item: T): T[] {
  return current.includes(item)
    ? current.filter((x) => x !== item)
    : [...current, item];
}

// ── Section header label ─────────────────────────────────────────────────────
function sectionLabel(name: string, selected: (string | number)[]): string {
  if (selected.length === 0) return name;
  return `${name}: ${selected.join(", ")}`;
}

// ── Any filters active? ──────────────────────────────────────────────────────
function hasActiveFilters(): boolean {
  return (
    filters.genre.length > 0 ||
    filters.developer.length > 0 ||
    filters.publisher.length > 0 ||
    filters.year.length > 0 ||
    filters.series.length > 0 ||
    filters.platform.length > 0 ||
    filters.favoritesOnly
  );
}

function resetAllFilters() {
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

function applyFilter(
  field: "genre" | "developer" | "publisher" | "year" | "series" | "platform",
  value: any
) {
  setFilters(field, toggleItem(filters[field] as any[], value) as any);
  setFilters("offset", 0);
  setSelectedIndex(0);
}

type SectionKey = "platform" | "genre" | "year" | "developer" | "publisher" | "series";

// ── Main component ────────────────────────────────────────────────────────────
export const FilterPanel: Component = () => {
  // Section collapse/expand state (Platform starts expanded, others collapsed)
  // Defined inside component so state resets per instance
  const [sectionOpen, setSectionOpen] = createStore<Record<SectionKey, boolean>>({
    platform: true,
    genre: false,
    year: false,
    developer: false,
    publisher: false,
    series: false,
  });

  // Genre sub-group collapse state (all collapsed initially)
  const [expandedGroups, setExpandedGroups] = createSignal<Set<string>>(new Set());

  const toggleGroup = (parent: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(parent)) next.delete(parent);
      else next.add(parent);
      return next;
    });
  };

  const opts = () =>
    filterOptions() ?? {
      genres: [],
      developers: [],
      publishers: [],
      years: [],
      series: [],
      platforms: [],
    };

  const genreGroups = () => buildGenreGroups(opts().genres);

  const SectionHdr = (props: { sectionKey: SectionKey; label: string; selected: (string | number)[] }) => (
    <div
      class="sidebar__section-header"
      onClick={() => setSectionOpen(props.sectionKey, (v) => !v)}
    >
      <span class="sidebar__section-arrow">
        {sectionOpen[props.sectionKey] ? "\u25BC" : "\u25B6"}
      </span>
      {" "}{sectionLabel(props.label, props.selected)}
    </div>
  );

  return (
    <div class="sidebar" tabindex="-1">
      {/* Reset Filters button — only shown when filters are active */}
      <Show when={hasActiveFilters()}>
        <div class="sidebar__reset-btn" onClick={resetAllFilters}>
          Reset Filters
        </div>
      </Show>

      {/* Platform section */}
      <Show when={opts().platforms.length > 1}>
        <SectionHdr sectionKey="platform" label="Platform" selected={filters.platform} />
        <Show when={sectionOpen.platform}>
          <div class="sidebar__section">
            <For each={opts().platforms}>
              {(p) => (
                <div
                  class={`sidebar__item ${filters.platform.includes(p) ? "sidebar__item--active" : ""}`}
                  onClick={() => applyFilter("platform", p)}
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
        <SectionHdr sectionKey="genre" label="Genre" selected={filters.genre} />
        <Show when={sectionOpen.genre}>
          <div class="sidebar__section">
            <For each={genreGroups()}>
              {(group) => (
                <>
                  {group.isFlat ? (
                    /* Flat genre — no nesting */
                    <div
                      class={`sidebar__item ${filters.genre.includes(group.parent) ? "sidebar__item--active" : ""}`}
                      onClick={() => applyFilter("genre", group.parent)}
                    >
                      {group.parent}
                    </div>
                  ) : (
                    /* Group with sub-genres */
                    <>
                      <div
                        class="sidebar__group-header"
                        onClick={() => toggleGroup(group.parent)}
                      >
                        {expandedGroups().has(group.parent) ? "\u25BC" : "\u25B6"} {group.parent}
                      </div>
                      <Show when={expandedGroups().has(group.parent)}>
                        <For each={group.children}>
                          {(child) => (
                            <div
                              class={`sidebar__item sidebar__item--indent ${filters.genre.includes(child.value) ? "sidebar__item--active" : ""}`}
                              onClick={() => applyFilter("genre", child.value)}
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
                  class={`sidebar__item ${filters.year.includes(y) ? "sidebar__item--active" : ""}`}
                  onClick={() => applyFilter("year", y)}
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
        <SectionHdr sectionKey="developer" label="Developer" selected={filters.developer} />
        <Show when={sectionOpen.developer}>
          <div class="sidebar__section">
            <For each={opts().developers}>
              {(d) => (
                <div
                  class={`sidebar__item ${filters.developer.includes(d) ? "sidebar__item--active" : ""}`}
                  onClick={() => applyFilter("developer", d)}
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
        <SectionHdr sectionKey="publisher" label="Publisher" selected={filters.publisher} />
        <Show when={sectionOpen.publisher}>
          <div class="sidebar__section">
            <For each={opts().publishers}>
              {(p) => (
                <div
                  class={`sidebar__item ${filters.publisher.includes(p) ? "sidebar__item--active" : ""}`}
                  onClick={() => applyFilter("publisher", p)}
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
        <SectionHdr sectionKey="series" label="Series" selected={filters.series} />
        <Show when={sectionOpen.series}>
          <div class="sidebar__section">
            <For each={opts().series}>
              {(s) => (
                <div
                  class={`sidebar__item ${filters.series.includes(s) ? "sidebar__item--active" : ""}`}
                  onClick={() => applyFilter("series", s)}
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
