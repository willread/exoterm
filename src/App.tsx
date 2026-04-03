import { Component, onMount, onCleanup, createEffect } from "solid-js";
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
  activePanel,
  setActivePanel,

  fetchGames,
  fetchFilterOptions,
  refetchCollections,
  refetchSelectedGame,
  sidebarWidth,
  setSidebarWidth,
  detailWidth,
  setDetailWidth,
  fontSize,
  setFontSize,
  setFilters,
  setSelectedGameId,
  setScanning,
  setScanStatus,
  getPersistedState,
  restorePersistedState,
} from "./lib/store";
import { loadState, saveStateDebounced } from "./lib/persist";
import { initKeyboardHandler, registerKey, clearBindings, guardedLaunch } from "./lib/keyboard";
import { launchGame, toggleFavorite, rescanAllCollections } from "./lib/commands";
import { listen } from "@tauri-apps/api/event";
import { ResizeHandle } from "./components/ResizeHandle";

const App: Component = () => {
  let unlistenInstalled: (() => void) | undefined;

  onCleanup(() => unlistenInstalled?.());

  onMount(async () => {
    // Listen for filesystem watcher events — refresh game list when installed status changes
    listen("installed-status-changed", () => {
      fetchGames();
      refetchSelectedGame();
    }).then((fn) => {
      unlistenInstalled = fn;
    });
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

    // Wait for fonts to load before revealing the UI to prevent FOUC
    try {
      await document.fonts.ready;
    } catch (_) {
      // fonts.ready not supported — proceed immediately
    }

    // Reveal the app
    const root = document.getElementById("root");
    if (root) root.style.visibility = "visible";

    // Auto-rescan on startup (only if collections exist)
    refetchCollections();
    // Small delay so the collections resource resolves first
    setTimeout(async () => {
      try {
        setScanning(true);
        setScanStatus("Scanning collections...");
        const count = await rescanAllCollections();
        setScanStatus(`Ready — ${count.toLocaleString()} games`);
        refetchCollections();
        fetchFilterOptions();
        fetchGames();
        setSelectedIndex(0);
        setSelectedGameId(null);
      } catch (_) {
        // No collections yet or scan error — silently ignore
        setScanStatus("");
      } finally {
        setTimeout(() => setScanning(false), 2000);
      }
    }, 100);

    // Initialize keyboard handler (guard against HMR double-mount)
    clearBindings();
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
          // Clear search (uses SearchBar's own clear to cancel debounce)
          (window as any).__clearSearch?.();
          // Clear all filters
          setFilters("contentType", "");
          setFilters("genre", "");
          setFilters("developer", "");
          setFilters("publisher", "");
          setFilters("year", null);
          setFilters("series", "");
          setFilters("platform", "");
          setFilters("favoritesOnly", false);
          setFilters("hasExtras", false);
          setFilters("installedOnly", false);
          setFilters("offset", 0);
          setSelectedIndex(0);
        }
      },
    });

    // ── Left/Right: switch between sidebar and list ──
    registerKey({
      key: "ArrowLeft",
      context: "global",
      handler: () => {
        if (activePanel() !== "sidebar") setActivePanel("sidebar");
      },
    });

    registerKey({
      key: "ArrowRight",
      context: "global",
      handler: () => {
        if (activePanel() !== "list") setActivePanel("list");
      },
    });

    // ── Up/Down: context-aware navigation ──
    registerKey({
      key: "ArrowDown",
      context: "global",
      handler: () => {
        if (activePanel() === "sidebar") {
          (window as any).__sidebarNav?.moveDown();
        } else {
          const max = gameList().length - 1;
          if (selectedIndex() < max) setSelectedIndex(selectedIndex() + 1);
        }
      },
    });

    registerKey({
      key: "ArrowUp",
      context: "global",
      handler: () => {
        if (activePanel() === "sidebar") {
          (window as any).__sidebarNav?.moveUp();
        } else {
          if (selectedIndex() > 0) setSelectedIndex(selectedIndex() - 1);
        }
      },
    });

    registerKey({
      key: "PageDown",
      context: "global",
      handler: () => {
        if (activePanel() === "sidebar") {
          (window as any).__sidebarNav?.pageDown();
        } else {
          const max = gameList().length - 1;
          setSelectedIndex(Math.min(selectedIndex() + 20, max));
        }
      },
    });

    registerKey({
      key: "PageUp",
      context: "global",
      handler: () => {
        if (activePanel() === "sidebar") {
          (window as any).__sidebarNav?.pageUp();
        } else {
          setSelectedIndex(Math.max(selectedIndex() - 20, 0));
        }
      },
    });

    registerKey({
      key: "Home",
      context: "global",
      handler: () => {
        if (activePanel() === "sidebar") {
          (window as any).__sidebarNav?.home();
        } else {
          setSelectedIndex(0);
        }
      },
    });

    registerKey({
      key: "End",
      context: "global",
      handler: () => {
        if (activePanel() === "sidebar") {
          (window as any).__sidebarNav?.end();
        } else {
          setSelectedIndex(gameList().length - 1);
        }
      },
    });

    // ── Enter: context-aware ──
    registerKey({
      key: "Enter",
      context: "global",
      handler: () => {
        if (activePanel() === "sidebar") {
          (window as any).__sidebarNav?.activate();
        } else {
          const games = gameList();
          const idx = selectedIndex();
          if (games[idx]) {
            guardedLaunch(() => launchGame(games[idx].id));
          }
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

    // ── R: random game ──
    registerKey({
      key: "r",
      context: "global",
      handler: () => {
        const count = gameList().length;
        if (count > 0) {
          const idx = Math.floor(Math.random() * count);
          setSelectedIndex(idx);
          setActivePanel("list");
          // Override auto-scroll after effects settle — place row at top.
          queueMicrotask(() => (window as any).__scrollToRow?.(idx));
        }
      },
    });

    // ── Zoom: + / - ──
    const applyZoom = (size: number) => {
      setFontSize(size);
      document.documentElement.style.setProperty("--font-size", size + "px");
      document.documentElement.style.setProperty("--char-h", size + "px");
    };

    registerKey({
      key: "+",
      context: "global",
      handler: () => applyZoom(Math.min(fontSize() + 2, 32)),
    });

    registerKey({
      key: "=",
      context: "global",
      handler: () => applyZoom(Math.min(fontSize() + 2, 32)),
    });

    registerKey({
      key: "-",
      context: "global",
      handler: () => applyZoom(Math.max(fontSize() - 2, 8)),
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
          <div>exoterm v{__APP_VERSION__}</div>
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
