import { Component, onMount, createEffect } from "solid-js";
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
  gameList,
  selectedIndex,
  setSelectedIndex,
  setSearchQuery,
  fetchGames,
  sidebarWidth,
  setSidebarWidth,
  detailWidth,
  setDetailWidth,
  fontSize,
  filters,
  getPersistedState,
  restorePersistedState,
} from "./lib/store";
import { loadState, saveStateDebounced } from "./lib/persist";
import { initKeyboardHandler, registerKey, guardedLaunch } from "./lib/keyboard";
import { launchGame, toggleFavorite } from "./lib/commands";
import { ResizeHandle } from "./components/ResizeHandle";

const App: Component = () => {
  onMount(async () => {
    // Restore persisted state before first render settles
    try {
      const saved = await loadState();
      if (Object.keys(saved).length > 0) {
        restorePersistedState(saved);
      }
    } catch (_) {
      // First run or no store — use defaults
    }

    // Apply theme/CRT/font to DOM
    document.documentElement.setAttribute("data-theme", theme());
    document.documentElement.setAttribute("data-crt", String(crtEnabled()));
    document.documentElement.style.setProperty("--font-size", fontSize() + "px");
    document.documentElement.style.setProperty("--char-h", fontSize() + "px");

    // Initialize keyboard handler
    initKeyboardHandler();

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
        if (activeDialog()) {
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
  });

  // Auto-persist whenever any persisted value changes
  createEffect(() => {
    const state = getPersistedState();
    saveStateDebounced(state);
  });

  // Keep DOM attributes in sync with reactive state
  createEffect(() => {
    document.documentElement.setAttribute("data-theme", theme());
  });
  createEffect(() => {
    document.documentElement.setAttribute("data-crt", String(crtEnabled()));
  });

  return (
    <>
      <div class="crt-overlay"><div class="crt-rgb" /></div>
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

      <Dialog
        title="About exoterm"
        visible={activeDialog() === "about"}
        onClose={() => setActiveDialog(null)}
        footer={
          <button class="dialog__button" onClick={() => setActiveDialog(null)}>
            {"< OK >"}
          </button>
        }
      >
        <div style="text-align: center; padding: 1ch;">
          <div>exoterm v0.1.0</div>
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
