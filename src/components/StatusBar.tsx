import { Component, Show, Switch, Match } from "solid-js";
import { scanning, scanStatus, activePanel, searchFocused } from "../lib/store";

export const StatusBar: Component = () => {
  return (
    <div class="status-bar no-select">
      <Switch>
        <Match when={searchFocused()}>
          <div class="status-bar__item">
            <span class="status-bar__hotkey">Enter</span>=Search
          </div>
          <div class="status-bar__item">
            <span class="status-bar__hotkey">Esc</span>=Clear
          </div>
        </Match>
        <Match when={activePanel() === "sidebar"}>
          <div class="status-bar__item">
            <span class="status-bar__hotkey">Enter</span>=Select
          </div>
          <div class="status-bar__item">
            <span class="status-bar__hotkey">{"\u2191\u2193"}</span>=Navigate
          </div>
          <div class="status-bar__item">
            <span class="status-bar__hotkey">{"\u2192"}</span>=Games
          </div>
        </Match>
        <Match when={true}>
          <div class="status-bar__item">
            <span class="status-bar__hotkey">Enter</span>=Launch
          </div>
          <div class="status-bar__item">
            <span class="status-bar__hotkey">{"\u2191\u2193"}</span>=Navigate
          </div>
          <div class="status-bar__item">
            <span class="status-bar__hotkey">/</span>=Search
          </div>
          <div class="status-bar__item">
            <span class="status-bar__hotkey">F</span>=Fav
          </div>
          <div class="status-bar__item">
            <span class="status-bar__hotkey">R</span>=Random
          </div>
          <div class="status-bar__item">
            <span class="status-bar__hotkey">{"\u2190"}</span>=Filters
          </div>
        </Match>
      </Switch>
      <div class="status-bar__spacer" />
      <Show when={scanning()}>
        <div class="status-bar__info">{scanStatus()}</div>
      </Show>
    </div>
  );
};
