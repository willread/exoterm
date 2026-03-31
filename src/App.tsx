import { Component, onMount, onCleanup, createSignal } from "solid-js";
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
} from "./lib/store";
import { initKeyboardHandler, registerKey, guardedLaunch } from "./lib/keyboard";
import { launchGame, toggleFavorite } from "./lib/commands";
import { ResizeHandle } from "./components/ResizeHandle";

const App: Component = () => {
  const [sidebarWidth, setSidebarWidth] = createSignal(200);
  const [detailWidth, setDetailWidth] = createSignal(320);

  onMount(async () => {
    // Set initial theme
    document.documentElement.setAttribute("data-theme", theme());
    document.documentElement.setAttribute("data-crt", String(crtEnabled()));

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
