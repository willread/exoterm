import { Component, For, Show, batch, createEffect, createMemo, createSignal } from "solid-js";
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
  fontSize,
} from "../lib/store";
import { toggleFavorite } from "../lib/commands";

// Extra rows to render above and below the visible viewport.
const OVERSCAN = 20;

export const GameList: Component = () => {
  let listRef: HTMLDivElement | undefined;

  const [scrollTop, setScrollTop] = createSignal(0);

  // Row height tracks the current font size (--char-h) so virtual scroll
  // stays correct after zoom in/out.
  const rowHeight = () => fontSize();

  // Derived virtual window — only re-compute when scroll or list length changes.
  const startIdx = createMemo(() =>
    Math.max(0, Math.floor(scrollTop() / rowHeight()) - OVERSCAN)
  );
  const endIdx = createMemo(() => {
    // In JSDOM (tests) clientHeight is 0; fall back to window.innerHeight.
    const containerH =
      listRef && listRef.clientHeight > 0
        ? listRef.clientHeight
        : window.innerHeight || 600;
    return Math.min(
      gameList().length,
      Math.ceil((scrollTop() + containerH) / rowHeight()) + OVERSCAN
    );
  });
  const visibleGames = createMemo(() =>
    gameList().slice(startIdx(), endIdx())
  );

  // Fetch whenever search query or any filter changes.
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
    const _extras = filters.hasExtras;
    const _sortBy = filters.sortBy;
    const _sortDir = filters.sortDir;
    const _offset = filters.offset;
    fetchGames();
  });

  // Update selected game id when index changes.
  createEffect(() => {
    const games = gameList();
    const idx = selectedIndex();
    if (games.length > 0 && idx >= 0 && idx < games.length) {
      setSelectedGameId(games[idx].id);
    } else {
      setSelectedGameId(null);
    }
  });

  // Auto-scroll to keep selected row visible; also sync scrollTop signal so
  // the virtual window stays correct after keyboard navigation.
  createEffect(() => {
    const idx = selectedIndex();
    if (listRef) {
      const rowTop = idx * rowHeight();
      if (rowTop < listRef.scrollTop) {
        listRef.scrollTop = rowTop;
        setScrollTop(rowTop);
      } else if (rowTop + rowHeight() > listRef.scrollTop + listRef.clientHeight) {
        const newTop = rowTop + rowHeight() - listRef.clientHeight;
        listRef.scrollTop = newTop;
        setScrollTop(newTop);
      }
    }
  });

  // Scroll the selected row to the very top of the viewport (used by random).
  (window as any).__scrollSelectedToTop = () => {
    if (!listRef) return;
    const rowTop = selectedIndex() * rowHeight();
    listRef.scrollTop = rowTop;
    setScrollTop(rowTop);
  };

  const handleSort = (col: string) => {
    // batch() ensures all store mutations happen atomically — the reactive
    // effect fires exactly ONCE with all updated values, so only one fetch
    // is dispatched per click.
    batch(() => {
      if (filters.sortBy === col) {
        setFilters("sortDir", filters.sortDir === "asc" ? "desc" : "asc");
      } else {
        setFilters("sortBy", col as any);
        setFilters("sortDir", "asc");
      }
      // Always reset to the top of the list when sort changes.
      setFilters("offset", 0);
      setSelectedIndex(0);
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
      <div
        class="game-list__body"
        ref={listRef}
        tabindex="-1"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        {/* Sticky header lives INSIDE the scroll container so it shares
            the exact same layout width as every data row — perfect alignment
            is structurally guaranteed, no measurement tricks needed. */}
        <div class="game-list__row game-list__row--header no-select">
          <div class="game-list__col game-list__col--fav" title="Favorite">*</div>
          <div class="game-list__col game-list__col--title" onClick={() => handleSort("title")}>
            Title{sortIndicator("title")}
          </div>
          <div class="game-list__col game-list__col--year" onClick={() => handleSort("year")}>
            Year{sortIndicator("year")}
          </div>
          <div class="game-list__col game-list__col--developer" onClick={() => handleSort("developer")}>
            Developer{sortIndicator("developer")}
          </div>
          <div class="game-list__col game-list__col--genre" onClick={() => handleSort("genre")}>
            Genre{sortIndicator("genre")}
          </div>
        </div>

        <Show
          when={gameList().length > 0}
          fallback={
            <div class="game-list__empty">
              <Show
                when={totalCount() === 0}
                fallback={"No matches."}
              >
                {"No games found. Add a collection from the File menu."}
              </Show>
            </div>
          }
        >
          {/* Outer spacer gives the scrollbar the correct total height */}
          <div
            class="game-list__virtual-spacer"
            style={{ height: `${gameList().length * rowHeight()}px` }}
          >
            {/* Inner container is shifted to the visible window position */}
            <div
              class="game-list__virtual-window"
              style={{ transform: `translateY(${startIdx() * rowHeight()}px)` }}
            >
              <For each={visibleGames()}>
                {(game, relIdx) => {
                  const absIdx = () => startIdx() + relIdx();
                  return (
                    <div
                      class={`game-list__row ${absIdx() === selectedIndex() ? "game-list__row--selected" : ""}`}
                      onClick={() => {
                        setSelectedIndex(absIdx());
                        setSelectedGameId(game.id);
                      }}
                    >
                      <div
                        class="game-list__col game-list__col--fav"
                        onClick={(e) => handleFavorite(game.id, e)}
                      >
                        {game.favorite ? "*" : ""}
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
                  );
                }}
              </For>
            </div>
          </div>
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
