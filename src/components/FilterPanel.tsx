import { Component, For, Show } from "solid-js";
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

      {/* Platform filter */}
      <Show when={opts().platforms.length > 1}>
        <div class="sidebar__title">
          Platform
          <Show when={filters.platform}>
            {" "}[<span style="cursor:pointer" onClick={() => clearFilter("platform")}>x</span>]
          </Show>
        </div>
        <div class="sidebar__section">
          <For each={opts().platforms.slice(0, 30)}>
            {(p) => (
              <div
                class={`sidebar__item ${filters.platform === p ? "sidebar__item--active" : ""}`}
                onClick={() => setFilter("platform", p)}
              >
                {p}
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Genre filter */}
      <Show when={opts().genres.length > 0}>
        <div class="sidebar__title">
          Genre
          <Show when={filters.genre}>
            {" "}[<span style="cursor:pointer" onClick={() => clearFilter("genre")}>x</span>]
          </Show>
        </div>
        <div class="sidebar__section">
          <For each={opts().genres.slice(0, 30)}>
            {(g) => (
              <div
                class={`sidebar__item ${filters.genre === g ? "sidebar__item--active" : ""}`}
                onClick={() => setFilter("genre", g)}
              >
                {g}
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Year filter */}
      <Show when={opts().years.length > 0}>
        <div class="sidebar__title">
          Year
          <Show when={filters.year}>
            {" "}[<span style="cursor:pointer" onClick={() => clearFilter("year")}>x</span>]
          </Show>
        </div>
        <div class="sidebar__section">
          <For each={opts().years.slice(-20)}>
            {(y) => (
              <div
                class={`sidebar__item ${filters.year === y ? "sidebar__item--active" : ""}`}
                onClick={() => setFilter("year", y)}
              >
                {y}
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Developer filter */}
      <Show when={opts().developers.length > 0}>
        <div class="sidebar__title">
          Developer
          <Show when={filters.developer}>
            {" "}[<span style="cursor:pointer" onClick={() => clearFilter("developer")}>x</span>]
          </Show>
        </div>
        <div class="sidebar__section">
          <For each={opts().developers.slice(0, 30)}>
            {(d) => (
              <div
                class={`sidebar__item ${filters.developer === d ? "sidebar__item--active" : ""}`}
                onClick={() => setFilter("developer", d)}
              >
                {d}
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Publisher filter */}
      <Show when={opts().publishers.length > 0}>
        <div class="sidebar__title">
          Publisher
          <Show when={filters.publisher}>
            {" "}[<span style="cursor:pointer" onClick={() => clearFilter("publisher")}>x</span>]
          </Show>
        </div>
        <div class="sidebar__section">
          <For each={opts().publishers.slice(0, 30)}>
            {(p) => (
              <div
                class={`sidebar__item ${filters.publisher === p ? "sidebar__item--active" : ""}`}
                onClick={() => setFilter("publisher", p)}
              >
                {p}
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
