import { Component, For, Show, createSignal } from "solid-js";
import {
  filters,
  setFilters,
  filterOptions,
  setSelectedIndex,
} from "../lib/store";
import type { ContentType } from "../lib/types";

const CONTENT_TYPES: { label: string; value: ContentType | "" }[] = [
  { label: "All", value: "" },
  { label: "Games", value: "Game" },
  { label: "Magazines", value: "Magazine" },
  { label: "Books", value: "Book" },
  { label: "Soundtracks", value: "Soundtrack" },
  { label: "Videos", value: "Video" },
  { label: "Catalogs", value: "Catalog" },
];

/** A collapsible sidebar section that shows all items. */
const FilterSection: Component<{
  title: string;
  items: any[];
  activeValue: any;
  filterField: string;
  onSet: (field: string, value: any) => void;
  onClear: (field: string) => void;
}> = (props) => {
  const [collapsed, setCollapsed] = createSignal(false);

  return (
    <Show when={props.items.length > 0}>
      <div
        class="sidebar__title"
        onClick={() => setCollapsed(!collapsed())}
      >
        <span class="sidebar__toggle">{collapsed() ? "\u25B6" : "\u25BC"}</span>
        {" "}{props.title} ({props.items.length})
        <Show when={props.activeValue}>
          {" "}[<span
            class="sidebar__clear"
            onClick={(e) => { e.stopPropagation(); props.onClear(props.filterField); }}
          >x</span>]
        </Show>
      </div>
      <Show when={!collapsed()}>
        <div class="sidebar__section">
          <For each={props.items}>
            {(item) => (
              <div
                class={`sidebar__item ${props.activeValue === item ? "sidebar__item--active" : ""}`}
                onClick={() => props.onSet(props.filterField, item)}
              >
                {item}
              </div>
            )}
          </For>
        </div>
      </Show>
    </Show>
  );
};

export const FilterPanel: Component = () => {
  const clearFilter = (field: string) => {
    setFilters(field as any, null);
    setFilters("offset", 0);
    setSelectedIndex(0);
  };

  const setFilter = (field: string, value: any) => {
    setFilters(field as any, value);
    setFilters("offset", 0);
    setSelectedIndex(0);
  };

  const opts = () => filterOptions() ?? { genres: [], developers: [], publishers: [], years: [], series: [], platforms: [] };

  return (
    <div class="sidebar" tabindex="-1">
      {/* Content Type Tabs */}
      <div class="content-tabs">
        <For each={CONTENT_TYPES}>
          {(ct) => (
            <div
              class={`content-tabs__tab ${filters.contentType === ct.value ? "content-tabs__tab--active" : ""}`}
              onClick={() => {
                setFilters("contentType", ct.value as any);
                setFilters("offset", 0);
                setSelectedIndex(0);
              }}
            >
              {ct.label}
            </div>
          )}
        </For>
      </div>

      <FilterSection
        title="Platform"
        items={opts().platforms}
        activeValue={filters.platform}
        filterField="platform"
        onSet={setFilter}
        onClear={clearFilter}
      />

      <FilterSection
        title="Genre"
        items={opts().genres}
        activeValue={filters.genre}
        filterField="genre"
        onSet={setFilter}
        onClear={clearFilter}
      />

      <FilterSection
        title="Year"
        items={opts().years}
        activeValue={filters.year}
        filterField="year"
        onSet={setFilter}
        onClear={clearFilter}
      />

      <FilterSection
        title="Developer"
        items={opts().developers}
        activeValue={filters.developer}
        filterField="developer"
        onSet={setFilter}
        onClear={clearFilter}
      />

      <FilterSection
        title="Publisher"
        items={opts().publishers}
        activeValue={filters.publisher}
        filterField="publisher"
        onSet={setFilter}
        onClear={clearFilter}
      />

      <FilterSection
        title="Series"
        items={opts().series}
        activeValue={filters.series}
        filterField="series"
        onSet={setFilter}
        onClear={clearFilter}
      />
    </div>
  );
};
