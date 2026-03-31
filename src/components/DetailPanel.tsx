import { Component, Show } from "solid-js";
import { selectedGame } from "../lib/store";

export const DetailPanel: Component = () => {
  const game = () => selectedGame();

  return (
    <div class="detail-panel">
      <Show
        when={game()}
        fallback={
          <div class="detail-panel__empty">
            Select a game to view details
          </div>
        }
      >
        {(g) => (
          <>
            <div class="detail-panel__title">{g().title}</div>

            <Show when={g().platform}>
              <div class="detail-panel__field">
                <span class="detail-panel__label">Platform:</span>
                <span class="detail-panel__value">{g().platform}</span>
              </div>
            </Show>

            <Show when={g().release_year}>
              <div class="detail-panel__field">
                <span class="detail-panel__label">Year:</span>
                <span class="detail-panel__value">{g().release_year}</span>
              </div>
            </Show>

            <Show when={g().developer}>
              <div class="detail-panel__field">
                <span class="detail-panel__label">Developer:</span>
                <span class="detail-panel__value">{g().developer}</span>
              </div>
            </Show>

            <Show when={g().publisher}>
              <div class="detail-panel__field">
                <span class="detail-panel__label">Publisher:</span>
                <span class="detail-panel__value">{g().publisher}</span>
              </div>
            </Show>

            <Show when={g().genre}>
              <div class="detail-panel__field">
                <span class="detail-panel__label">Genre:</span>
                <span class="detail-panel__value">{g().genre}</span>
              </div>
            </Show>

            <Show when={g().series}>
              <div class="detail-panel__field">
                <span class="detail-panel__label">Series:</span>
                <span class="detail-panel__value">{g().series}</span>
              </div>
            </Show>

            <Show when={g().play_mode}>
              <div class="detail-panel__field">
                <span class="detail-panel__label">Players:</span>
                <span class="detail-panel__value">{g().play_mode}</span>
              </div>
            </Show>

            <Show when={g().source}>
              <div class="detail-panel__field">
                <span class="detail-panel__label">Source:</span>
                <span class="detail-panel__value">{g().source}</span>
              </div>
            </Show>

            <div class="detail-panel__field">
              <span class="detail-panel__label">Favorite:</span>
              <span class="detail-panel__value">
                {g().favorite ? "\u2605 Yes" : "No"}
              </span>
            </div>

            <Show when={g().overview}>
              <div class="detail-panel__overview">{g().overview}</div>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
};
