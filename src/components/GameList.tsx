import { Component, For, Show, createEffect, on } from "solid-js";
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

  // Fetch games when search/filters change
  createEffect(
    on(
      () => [
        searchQuery(),
        filters.contentType,
        filters.genre,
        filters.developer,
        filters.publisher,
        filters.year,
        filters.series,
        filters.platform,
        filters.favoritesOnly,
        filters.sortBy,
        filters.sortDir,
        filters.offset,
      ],
      () => {
        fetchGames();
      }
    )
  );

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
      const rowHeight = 16; // --char-h
      const scrollTop = listRef.scrollTop;
      const viewHeight = listRef.clientHeight;
      const rowTop = idx * rowHeight;

      if (rowTop < scrollTop) {
        listRef.scrollTop = rowTop;
      } else if (rowTop + rowHeight > scrollTop + viewHeight) {
        listRef.scrollTop = rowTop + rowHeight - viewHeight;
      }
    }
  });

  const handleSort = (col: string) => {
    if (filters.sortBy === col) {
      setFilters("sortDir", filters.sortDir === "asc" ? "desc" : "asc");
    } else {
      setFilters("sortBy", col as any);
      setFilters("sortDir", "asc");
    }
  };

  const sortIndicator = (col: string) => {
    if (filters.sortBy === col) {
      return filters.sortDir === "asc" ? " \u25B2" : " \u25BC";
    }
    return "";
  };

  const handleFavorite = async (id: number, e: Event) => {
    e.stopPropagation();
    await toggleFavorite(id);
    fetchGames();
  };

  return (
    <div class="game-list">
      <div class="game-list__header">
        <div
          class="game-list__header-col game-list__col--fav"
          title="Favorite"
        >
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

      <div class="game-list__body" ref={listRef}>
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
                  // Launch on double-click
                  import("../lib/commands").then((c) => c.launchGame(game.id));
                }}
              >
                <div
                  class="game-list__col game-list__col--fav"
                  onClick={(e) => handleFavorite(game.id, e)}
                >
                  {game.favorite ? "\u2605" : ""}
                </div>
                <div class="game-list__col game-list__col--title">
                  {game.title}
                </div>
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
