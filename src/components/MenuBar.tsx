import { Component, Show, For, onMount, onCleanup, createSignal } from "solid-js";
import { activeMenu, setActiveMenu, setActiveDialog, theme, setTheme, crtEnabled, setCrtEnabled, fontSize, setFontSize, fetchGames, setScanning, setScanStatus, refetchCollections } from "../lib/store";
import { clearAllFavorites, rescanAllCollections } from "../lib/commands";
import type { Theme } from "../lib/types";

const THEMES: { label: string; value: Theme }[] = [
  { label: "Big Blue",       value: "blue"  },
  { label: "Black & White",  value: "bw"    },
  { label: "Amber Phosphor", value: "amber" },
  { label: "Green Phosphor", value: "green" },
  { label: "Windows 95",     value: "win95" },
  { label: "Windows 3.x",    value: "win3x" },
];

export const MenuBar: Component = () => {
  let menuBarRef: HTMLDivElement | undefined;
  const [themeSubmenuOpen, setThemeSubmenuOpen] = createSignal(false);
  const [confirmClearFavs, setConfirmClearFavs] = createSignal(false);

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu() === menu ? null : menu);
    setThemeSubmenuOpen(false);
  };

  const closeMenu = () => {
    setActiveMenu(null);
    setThemeSubmenuOpen(false);
  };

  const handleDocumentClick = (e: MouseEvent) => {
    if (activeMenu() && menuBarRef && !menuBarRef.contains(e.target as Node)) {
      closeMenu();
    }
  };

  onMount(() => document.addEventListener("click", handleDocumentClick));
  onCleanup(() => document.removeEventListener("click", handleDocumentClick));

  const selectTheme = (t: Theme) => {
    setTheme(t);
    closeMenu();
  };

  const handleMinimize = () => {
    import("@tauri-apps/api/window")
      .then(m => m.getCurrentWindow().minimize())
      .catch(console.error);
  };

  const handleMaximize = () => {
    import("@tauri-apps/api/window")
      .then(m => {
        const win = m.getCurrentWindow();
        win.isMaximized().then(maximized => {
          if (maximized) win.unmaximize();
          else win.maximize();
        });
      })
      .catch(console.error);
  };

  const handleClose = () => {
    import("@tauri-apps/api/window")
      .then(m => m.getCurrentWindow().close())
      .catch(console.error);
  };

  return (
    <div class="menu-bar no-select" ref={menuBarRef} data-tauri-drag-region>
      {/* File */}
      <div
        class={`menu-bar__item ${activeMenu() === "file" ? "menu-bar__item--active" : ""}`}
        onClick={() => toggleMenu("file")}
      >
        <span class="menu-bar__hotkey">F</span>ile
        <Show when={activeMenu() === "file"}>
          <div class="dropdown">
            <div class="dropdown__item" onClick={() => { setActiveDialog("manage-collections"); closeMenu(); }}>
              Manage Collections...
            </div>
            <div class="dropdown__item" onClick={() => { setActiveDialog("collections"); closeMenu(); }}>
              Add Collection...
            </div>
            <div class="dropdown__item" onClick={async () => {
              closeMenu();
              setScanning(true);
              setScanStatus("Re-scanning collections...");
              try {
                const count = await rescanAllCollections();
                setScanStatus(`Re-scan complete: ${count.toLocaleString()} games`);
                refetchCollections();
                fetchGames();
              } catch (e) {
                setScanStatus(`Re-scan failed: ${e}`);
              } finally {
                setTimeout(() => setScanning(false), 3000);
              }
            }}>
              Re-scan Collections
            </div>
            <div class="dropdown__separator" />
            <div class="dropdown__item" onClick={() => { handleClose(); closeMenu(); }}>
              Exit <span class="dropdown__shortcut">Alt+F4</span>
            </div>
          </div>
        </Show>
      </div>

      {/* Options */}
      <div
        class={`menu-bar__item ${activeMenu() === "options" ? "menu-bar__item--active" : ""}`}
        onClick={() => toggleMenu("options")}
      >
        <span class="menu-bar__hotkey">O</span>ptions
        <Show when={activeMenu() === "options"}>
          <div class="dropdown">
            <div
              class="dropdown__item dropdown__item--submenu"
              onMouseEnter={() => setThemeSubmenuOpen(true)}
              onMouseLeave={() => setThemeSubmenuOpen(false)}
            >
              {"Theme"}
              <Show when={themeSubmenuOpen()}>
                <div class="dropdown dropdown--submenu">
                  <For each={THEMES}>
                    {(t) => (
                      <div
                        class={`dropdown__item ${theme() === t.value ? "dropdown__item--active" : ""}`}
                        onClick={() => selectTheme(t.value)}
                      >
                        <span class="dropdown__check">{theme() === t.value ? "\u2713" : " "}</span>
                        {t.label}
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
            <div class="dropdown__item" onClick={() => { setCrtEnabled(!crtEnabled()); closeMenu(); }}>
              CRT Effects: {crtEnabled() ? "ON" : "OFF"}
            </div>
            <div class="dropdown__separator" />
            <div class="dropdown__item" onClick={() => {
              const next = Math.min(fontSize() + 2, 32);
              setFontSize(next);
              document.documentElement.style.setProperty("--font-size", next + "px");
              document.documentElement.style.setProperty("--char-h", next + "px");
            }}>
              Zoom In (+)
            </div>
            <div class="dropdown__item" onClick={() => {
              const next = Math.max(fontSize() - 2, 8);
              setFontSize(next);
              document.documentElement.style.setProperty("--font-size", next + "px");
              document.documentElement.style.setProperty("--char-h", next + "px");
            }}>
              Zoom Out (-)
            </div>
          </div>
        </Show>
      </div>

      {/* Tools */}
      <div
        class={`menu-bar__item ${activeMenu() === "tools" ? "menu-bar__item--active" : ""}`}
        onClick={() => toggleMenu("tools")}
      >
        <span class="menu-bar__hotkey">T</span>ools
        <Show when={activeMenu() === "tools"}>
          <div class="dropdown">
            <div class="dropdown__item" onClick={() => { setConfirmClearFavs(true); closeMenu(); }}>
              Clear All Favorites...
            </div>
          </div>
        </Show>
      </div>

      {/* Help */}
      <div
        class={`menu-bar__item ${activeMenu() === "help" ? "menu-bar__item--active" : ""}`}
        onClick={() => toggleMenu("help")}
      >
        <span class="menu-bar__hotkey">H</span>elp
        <Show when={activeMenu() === "help"}>
          <div class="dropdown">
            <div class="dropdown__item" onClick={() => { setActiveDialog("about"); closeMenu(); }}>
              About exoterm
            </div>
          </div>
        </Show>
      </div>

      {/* Center title — draggable area */}
      <div class="menu-bar__title" data-tauri-drag-region>exoterm</div>

      {/* Window controls — DOS box-drawing characters */}
      <div class="menu-bar__controls">
        <div class="menu-bar__control" onClick={handleMinimize} title="Minimize">{"\u2500"}</div>
        <div class="menu-bar__control" onClick={handleMaximize} title="Maximize">{"\u2610"}</div>
        <div class="menu-bar__control menu-bar__control--close" onClick={handleClose} title="Close">X</div>
      </div>

      {/* Confirm clear favorites dialog */}
      <Show when={confirmClearFavs()}>
        <div class="dialog-overlay" onClick={() => setConfirmClearFavs(false)}>
          <div class="dialog" onClick={(e) => e.stopPropagation()}>
            <div class="dialog__title">Confirm</div>
            <div class="dialog__body">
              Clear all favorites? This cannot be undone.
            </div>
            <div class="dialog__footer">
              <button class="dialog__button" onClick={() => setConfirmClearFavs(false)}>Cancel</button>
              <button class="dialog__button" onClick={async () => {
                await clearAllFavorites();
                setConfirmClearFavs(false);
                fetchGames();
              }}>Clear</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
