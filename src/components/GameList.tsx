import { Component, For, Show, createEffect, batch } from "solid-js";
import {
  gameList,
  selectedIndex,
  setSelectedIndex,
  setSelectedGameId,
  filters,
  setFilters,
  totalCount,
  fetchGames,
  searchQuery,
} from "../lib/store";
import { toggleFavorite } from "../lib/commands";

export const GameList: Component = () => {
  let listRef: HTMLDivElement | undefined;

  // Fetch whenever search query or any filter changes.
  // Plain createEffect tracks all reactive reads inside it automatically.
  createEffect(() => {
    const _q = searchQuery();
    const _ct = filters.contentType;
    const _genre = filters.genre;
    const _dev = filters.developer;
    const _pub = filters.publisher;
    const _year = filters.year;
    const _series = filters.series;
    const _plat = filters.platform;
    const _fav = filters.favoritesOnly;
    const _sortBy = filters.sortBy;
    const _sortDir = filters.sortDir;
    const _offset = filters.offset;
    fetchGames();
  });

  // Update selected game id when index changes
  createEffect(() => {
    const games = gameList();
    const idx = selectedIndex();
    if (games.length > 0 && idx >= 0 && idx < games.length) {
      setSelectedGameId(games[idx].id);
    } else {
      setSelectedGameId(null);
    }
  });

  // Auto-scroll to keep selected row visible
  createEffect(() => {
    const idx = selectedIndex();
    if (listRef) {
      const rowHeight = 16;
      const rowTop = idx * rowHeight;
      if (rowTop < listRef.scrollTop) {
        listRef.scrollTop = rowTop;
      } else if (rowTop + rowHeight > listRef.scrollTop + listRef.clientHeight) {
        listRef.scrollTop = rowTop + rowHeight - listRef.clientHeight;
      }
    }
  });

  const handleSort = (col: string) => {
    batch(() => {
      if (filters.sortBy === col) {
        setFilters("sortDir", filters.sortDir === "asc" ? "desc" : "asc");
      } else {
        setFilters("sortBy", col as any);
        setFilters("sortDir", "asc");
      }
    });
  };

  const sortIndicator = (col: string) => {
    if (filters.sortBy === col) {
      return filters.sortDir === "asc" ? " \u25B2" : " \u25BC";
    }
    return "";
  };

  const handleFavorite = async (id: number, e: MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(id);
    fetchGames();
  };

  return (
    <div class="game-list">
      <div class="game-list__header no-select">
        <div class="game-list__header-col game-list__col--fav" title="Favorite">
          *
        </div>
        <div
          class="game-list__header-col game-list__col--title"
          onClick={() => handleSort("title")}
        >
          Title{sortIndicator("title")}
        </div>
        <div
          class="game-list__header-col game-list__col--year"
          onClick={() => handleSort("year")}
        >
          Year{sortIndicator("year")}
        </div>
        <div
          class="game-list__header-col game-list__col--developer"
          onClick={() => handleSort("developer")}
        >
          Developer{sortIndicator("developer")}
        </div>
        <div
          class="game-list__header-col game-list__col--genre"
          onClick={() => handleSort("genre")}
        >
          Genre{sortIndicator("genre")}
        </div>
      </div>

      <div class="game-list__body" ref={listRef} tabindex="-1">
        <Show
          when={gameList().length > 0}
          fallback={
            <div class="game-list__empty">
              {totalCount() === 0
                ? "No games found. Add a collection via File menu."
                : "No matches."}
            </div>
          }
        >
          <For each={gameList()}>
            {(game, index) => (
              <div
                class={`game-list__row ${index() === selectedIndex() ? "game-list__row--selected" : ""}`}
                onClick={() => {
                  setSelectedIndex(index());
                  setSelectedGameId(game.id);
                }}
                onDblClick={() => {
                  import("../lib/commands").then((c) => c.launchGame(game.id));
                }}
              >
                <div
                  class="game-list__col game-list__col--fav"
                  onClick={(e) => handleFavorite(game.id, e)}
                >
                  {game.favorite ? "\u2605" : ""}
                </div>
                <div class="game-list__col game-list__col--title">{game.title}</div>
                <div class="game-list__col game-list__col--year">
                  {game.release_year ?? ""}
                </div>
                <div class="game-list__col game-list__col--developer">
                  {game.developer ?? ""}
                </div>
                <div class="game-list__col game-list__col--genre">
                  {game.genre ?? ""}
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      <div class="game-list__count">
        {totalCount() > 0
          ? `${selectedIndex() + 1} / ${totalCount().toLocaleString()}`
          : ""}
      </div>
    </div>
  );
};
