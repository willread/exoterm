import { Component, Show } from "solid-js";
import { scanning, scanStatus } from "../lib/store";

export const StatusBar: Component = () => {
  return (
    <div class="status-bar no-select">
      <div class="status-bar__item">
        <span class="status-bar__hotkey">Enter</span>=Launch
      </div>
      <div class="status-bar__item">
        <span class="status-bar__hotkey">/</span>=Search
      </div>
      <div class="status-bar__item">
        <span class="status-bar__hotkey">F</span>=Fav
      </div>
      <div class="status-bar__spacer" />
      <Show when={scanning()}>
        <div class="status-bar__info">{scanStatus()}</div>
      </Show>
    </div>
  );
};
