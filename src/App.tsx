import { Component, For, onMount, onCleanup, createSignal } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { MenuBar } from "./components/MenuBar";
import { StatusBar } from "./components/StatusBar";
import { SearchBar } from "./components/SearchBar";
import { FilterPanel } from "./components/FilterPanel";
import { GameList } from "./components/GameList";
import { DetailPanel } from "./components/DetailPanel";
import { CollectionPicker } from "./components/CollectionPicker";
import { Dialog } from "./components/Dialog";
import {
  theme,
  crtEnabled,
  activeDialog,
  setActiveDialog,
  setActiveMenu,
  activeMenu,
  activePanel,
  setActivePanel,
  gameList,
  selectedIndex,
  setSelectedIndex,
  setSearchQuery,
  gameChoice,
  setGameChoice,
  fetchGames,
} from "./lib/store";
import { initKeyboardHandler, registerKey, guardedLaunch } from "./lib/keyboard";
import { launchGame, toggleFavorite, sendGameInput } from "./lib/commands";
import { ResizeHandle } from "./components/ResizeHandle";
import type { ChoicePayload } from "./lib/types";

const App: Component = () => {
  const [sidebarWidth, setSidebarWidth] = createSignal(200);
  const [detailWidth, setDetailWidth] = createSignal(320);

  onMount(async () => {
    // Set initial theme
    document.documentElement.setAttribute("data-theme", theme());
    document.documentElement.setAttribute("data-crt", String(crtEnabled()));

    // Initialize keyboard handler
    initKeyboardHandler();

    // Listen for CHOICE.EXE prompts from the game process
    const unlistenChoice = await listen<ChoicePayload>("game-choice", (event) => {
      setGameChoice(event.payload);
    });

    // Clear choice dialog when game exits
    const unlistenExit = await listen("game-exited", () => {
      setGameChoice(null);
    });

    onCleanup(() => {
      unlistenChoice();
      unlistenExit();
    });

    // Register global hotkeys
    registerKey({
      key: "/",
      context: "global",
      handler: () => (window as any).__focusSearch?.(),
    });

    registerKey({
      key: "f",
      ctrl: true,
      context: "global",
      handler: () => (window as any).__focusSearch?.(),
    });

    registerKey({
      key: "Escape",
      context: "global",
      handler: () => {
        if (gameChoice()) {
          setGameChoice(null);
        } else if (activeDialog()) {
          setActiveDialog(null);
        } else if (activeMenu()) {
          setActiveMenu(null);
        } else {
          setSearchQuery("");
          const input = document.querySelector(".search-bar__input") as HTMLInputElement;
          if (input) input.value = "";
        }
      },
    });

    registerKey({
      key: "ArrowDown",
      context: "global",
      handler: () => {
        const max = gameList().length - 1;
        if (selectedIndex() < max) {
          setSelectedIndex(selectedIndex() + 1);
        }
      },
    });

    registerKey({
      key: "ArrowUp",
      context: "global",
      handler: () => {
        if (selectedIndex() > 0) {
          setSelectedIndex(selectedIndex() - 1);
        }
      },
    });

    registerKey({
      key: "PageDown",
      context: "global",
      handler: () => {
        const max = gameList().length - 1;
        setSelectedIndex(Math.min(selectedIndex() + 20, max));
      },
    });

    registerKey({
      key: "PageUp",
      context: "global",
      handler: () => {
        setSelectedIndex(Math.max(selectedIndex() - 20, 0));
      },
    });

    registerKey({
      key: "Home",
      context: "global",
      handler: () => setSelectedIndex(0),
    });

    registerKey({
      key: "End",
      context: "global",
      handler: () => setSelectedIndex(gameList().length - 1),
    });

    registerKey({
      key: "Enter",
      context: "global",
      handler: () => {
        const games = gameList();
        const idx = selectedIndex();
        if (games[idx]) {
          guardedLaunch(() => launchGame(games[idx].id));
        }
      },
    });

    registerKey({
      key: "f",
      context: "global",
      handler: () => {
        const games = gameList();
        const idx = selectedIndex();
        if (games[idx]) {
          toggleFavorite(games[idx].id).then(() => fetchGames());
        }
      },
    });

    registerKey({
      key: "f",
      alt: true,
      context: "global",
      handler: () => setActiveMenu(activeMenu() === "file" ? null : "file"),
    });

    registerKey({
      key: "v",
      alt: true,
      context: "global",
      handler: () => setActiveMenu(activeMenu() === "view" ? null : "view"),
    });

    registerKey({
      key: "o",
      alt: true,
      context: "global",
      handler: () => setActiveMenu(activeMenu() === "options" ? null : "options"),
    });

    registerKey({
      key: "h",
      alt: true,
      context: "global",
      handler: () => setActiveMenu(activeMenu() === "help" ? null : "help"),
    });

    // Tab cycles: sidebar -> list -> detail -> sidebar
    const PANELS = ["sidebar", "list", "detail"] as const;
    registerKey({
      key: "Tab",
      context: "global",
      handler: () => {
        const idx = PANELS.indexOf(activePanel());
        const next = PANELS[(idx + 1) % PANELS.length];
        setActivePanel(next);
        // Move focus to the appropriate element
        if (next === "list") {
          document.querySelector<HTMLElement>(".game-list__body")?.focus();
        } else if (next === "sidebar") {
          document.querySelector<HTMLElement>(".sidebar")?.focus();
        } else if (next === "detail") {
          document.querySelector<HTMLElement>(".detail-panel")?.focus();
        }
      },
    });

    registerKey({
      key: "Tab",
      shift: true,
      context: "global",
      handler: () => {
        const idx = PANELS.indexOf(activePanel());
        const prev = PANELS[(idx + PANELS.length - 1) % PANELS.length];
        setActivePanel(prev);
        if (prev === "list") {
          document.querySelector<HTMLElement>(".game-list__body")?.focus();
        } else if (prev === "sidebar") {
          document.querySelector<HTMLElement>(".sidebar")?.focus();
        } else if (prev === "detail") {
          document.querySelector<HTMLElement>(".detail-panel")?.focus();
        }
      },
    });

  });

  const handleChoice = (option: string) => {
    setGameChoice(null);
    sendGameInput(option).catch(console.error);
  };

  return (
    <>
      <div class="crt-overlay" />
      <MenuBar />
      <SearchBar />
      <div class="main-content">
        <div style={`width: ${sidebarWidth()}px; flex-shrink: 0;`}>
          <FilterPanel />
        </div>
        <ResizeHandle
          direction="horizontal"
          onResize={(d) => setSidebarWidth(Math.max(120, Math.min(500, sidebarWidth() + d)))}
        />
        <GameList />
        <ResizeHandle
          direction="horizontal"
          onResize={(d) => setDetailWidth(Math.max(200, Math.min(600, detailWidth() - d)))}
        />
        <div style={`width: ${detailWidth()}px; flex-shrink: 0;`}>
          <DetailPanel />
        </div>
      </div>
      <StatusBar />

      {/* Dialogs */}
      <CollectionPicker />

      {/* Game CHOICE.EXE prompt dialog */}
      <Dialog
        title="Game Prompt"
        visible={gameChoice() !== null}
        onClose={() => setGameChoice(null)}
        footer={
          <div style="display: flex; gap: 1ch; justify-content: center; flex-wrap: wrap;">
            <For each={gameChoice()?.options ?? []}>
              {(opt) => (
                <button
                  class="dialog__button"
                  onClick={() => handleChoice(opt)}
                >
                  {`< ${opt} >`}
                </button>
              )}
            </For>
          </div>
        }
      >
        <div style="text-align: center; padding: 1ch; white-space: pre-wrap;">
          {gameChoice()?.message || "The game is asking for input:"}
        </div>
      </Dialog>

      <Dialog
        title="About eXo Terminal"
        visible={activeDialog() === "about"}
        onClose={() => setActiveDialog(null)}
        footer={
          <button class="dialog__button" onClick={() => setActiveDialog(null)}>
            {"< OK >"}
          </button>
        }
      >
        <div style="text-align: center; padding: 1ch;">
          <div>eXo Terminal v0.1.0</div>
          <div style="margin-top: 4px;">
            A DOS-style frontend for eXo collections
          </div>
          <div style="margin-top: 4px; opacity: 0.7;">
            Built with Tauri 2 + SolidJS
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default App;
