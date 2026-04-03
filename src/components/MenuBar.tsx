import { Component, Show, For, onMount, onCleanup, createSignal, createEffect } from "solid-js";
import { activeMenu, setActiveMenu, setActiveDialog, theme, setTheme, crtEnabled, setCrtEnabled, fontSize, setFontSize, showBoxArt, setShowBoxArt, fetchGames, fetchFilterOptions, setScanning, setScanStatus, refetchCollections, setFilters, setSelectedIndex, setSelectedGameId, setSidebarWidth, setDetailWidth } from "../lib/store";
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

// Ordered list of top-level menus — used for Left/Right arrow navigation.
const MENU_ORDER = ["file", "options", "tools", "help"] as const;
type MenuKey = typeof MENU_ORDER[number];

export const MenuBar: Component = () => {
  let menuBarRef: HTMLDivElement | undefined;
  const [themeSubmenuOpen, setThemeSubmenuOpen] = createSignal(false);
  const [confirmClearFavs, setConfirmClearFavs] = createSignal(false);
  const [confirmResetUI, setConfirmResetUI] = createSignal(false);

  const doResetUI = () => {
    (window as any).__clearSearch?.();
    setFilters("genre", "");
    setFilters("developer", "");
    setFilters("publisher", "");
    setFilters("year", null);
    setFilters("series", "");
    setFilters("platform", "");
    setFilters("favoritesOnly", false);
    setFilters("hasExtras", false);
    setFilters("sortBy", "title");
    setFilters("sortDir", "asc");
    setFilters("offset", 0);
    setSidebarWidth(200);
    setDetailWidth(320);
    setSelectedIndex(0);
    setSelectedGameId(null);
    setTheme("blue");
    setCrtEnabled(false);
    setShowBoxArt(true);
    const defaultSize = 16;
    setFontSize(defaultSize);
    document.documentElement.style.setProperty("--font-size", defaultSize + "px");
    document.documentElement.style.setProperty("--char-h", defaultSize + "px");
    document.documentElement.setAttribute("data-theme", "blue");
    document.documentElement.setAttribute("data-crt", "false");
    fetchFilterOptions();
    setConfirmResetUI(false);
  };

  const [focusedItemIndex, setFocusedItemIndex] = createSignal(-1);
  const [submenuActive, setSubmenuActive] = createSignal(false);
  const [focusedSubmenuIndex, setFocusedSubmenuIndex] = createSignal(-1);

  // Return ALL navigable items in the currently open top-level dropdown,
  // including submenu triggers (e.g. Theme).
  const getDropdownItems = (): HTMLElement[] => {
    if (!menuBarRef) return [];
    return Array.from(
      menuBarRef.querySelectorAll<HTMLElement>(
        ".dropdown:not(.dropdown--submenu) > .dropdown__item"
      )
    );
  };

  // Return items inside the open submenu.
  const getSubmenuItems = (): HTMLElement[] => {
    if (!menuBarRef) return [];
    return Array.from(
      menuBarRef.querySelectorAll<HTMLElement>(
        ".dropdown--submenu > .dropdown__item"
      )
    );
  };

  // Sync the --focused CSS class to parent dropdown items.
  createEffect(() => {
    const idx = focusedItemIndex();
    getDropdownItems().forEach((el, i) =>
      el.classList.toggle("dropdown__item--focused", i === idx)
    );
  });

  // Sync the --focused CSS class to submenu items.
  createEffect(() => {
    const idx = focusedSubmenuIndex();
    getSubmenuItems().forEach((el, i) =>
      el.classList.toggle("dropdown__item--focused", i === idx)
    );
  });

  // Reset the cursor whenever a different (or no) menu opens.
  createEffect(() => {
    activeMenu(); // reactive dependency
    setFocusedItemIndex(-1);
    setSubmenuActive(false);
    setFocusedSubmenuIndex(-1);
  });

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

  // Open the submenu from the parent dropdown (keyboard).
  const enterSubmenu = () => {
    setThemeSubmenuOpen(true);
    setSubmenuActive(true);
    setFocusedSubmenuIndex(0);
  };

  // Return from submenu back to the parent dropdown (keyboard).
  const exitSubmenu = () => {
    setSubmenuActive(false);
    setFocusedSubmenuIndex(-1);
    setThemeSubmenuOpen(false);
    // focusedItemIndex stays on "Theme" so user returns there
  };

  // Keyboard navigation for open dropdown menus.
  // Up/Down move the cursor, Enter activates, Left/Right switch menus.
  // When a submenu is active, keys navigate within it; Escape/Left returns.
  // Alt+letter opens the matching menu (works even when no menu is open).
  // Escape is already handled globally in App.tsx.
  const handleMenuKeyDown = (e: KeyboardEvent) => {
    // Alt+letter shortcuts — open/toggle the matching top-level menu.
    if (e.altKey && !e.ctrlKey && !e.shiftKey) {
      const altMap: Record<string, MenuKey> = {
        f: "file", o: "options", t: "tools", h: "help",
      };
      const target = altMap[e.key.toLowerCase()];
      if (target) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggleMenu(target);
        return;
      }
    }

    if (!activeMenu()) return;

    // ── Submenu-active branch ──────────────────────────────────────────
    if (submenuActive()) {
      const subItems = getSubmenuItems();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setFocusedSubmenuIndex((i) => Math.min(i + 1, subItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setFocusedSubmenuIndex((i) => (i <= 0 ? 0 : i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopImmediatePropagation();
        const idx = focusedSubmenuIndex();
        if (idx >= 0 && idx < subItems.length) {
          subItems[idx].click();
        }
      } else if (e.key === "Escape" || e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopImmediatePropagation();
        exitSubmenu();
      }
      return;
    }

    // ── Parent dropdown branch ─────────────────────────────────────────

    // ArrowRight: if focused item is a submenu trigger, open submenu instead
    // of switching menus.
    if (e.key === "ArrowRight") {
      e.preventDefault();
      e.stopImmediatePropagation();
      const items = getDropdownItems();
      const idx = focusedItemIndex();
      if (idx >= 0 && items[idx]?.classList.contains("dropdown__item--submenu")) {
        enterSubmenu();
        return;
      }
      // Otherwise switch to next top-level menu.
      const currentIdx = (MENU_ORDER as readonly string[]).indexOf(activeMenu()!);
      if (currentIdx !== -1) {
        const nextIdx = (currentIdx + 1) % MENU_ORDER.length;
        setActiveMenu(MENU_ORDER[nextIdx]);
        setThemeSubmenuOpen(false);
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopImmediatePropagation();
      const currentIdx = (MENU_ORDER as readonly string[]).indexOf(activeMenu()!);
      if (currentIdx !== -1) {
        const nextIdx = (currentIdx - 1 + MENU_ORDER.length) % MENU_ORDER.length;
        setActiveMenu(MENU_ORDER[nextIdx]);
        setThemeSubmenuOpen(false);
      }
      return;
    }

    const items = getDropdownItems();
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopImmediatePropagation();
      setFocusedItemIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopImmediatePropagation();
      setFocusedItemIndex((i) => (i <= 0 ? 0 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopImmediatePropagation();
      const idx = focusedItemIndex();
      if (idx >= 0 && idx < items.length) {
        // If the focused item is a submenu trigger, open the submenu
        if (items[idx].classList.contains("dropdown__item--submenu")) {
          enterSubmenu();
        } else {
          items[idx].click();
        }
      }
    }
  };

  onMount(() => {
    document.addEventListener("click", handleDocumentClick);
    // Use capture so this fires before App.tsx's registered key handlers.
    document.addEventListener("keydown", handleMenuKeyDown, true);
  });
  onCleanup(() => {
    document.removeEventListener("click", handleDocumentClick);
    document.removeEventListener("keydown", handleMenuKeyDown, true);
  });

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
                // Reset selection so stale IDs don't break navigation
                setSelectedIndex(0);
                setSelectedGameId(null);
                fetchGames();
                fetchFilterOptions();
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
              onMouseLeave={() => { if (!submenuActive()) setThemeSubmenuOpen(false); }}
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
            <div class="dropdown__item" onClick={() => { setShowBoxArt(!showBoxArt()); closeMenu(); }}>
              Screenshots: {showBoxArt() ? "ON" : "OFF"}
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
            <div class="dropdown__item" onClick={() => { setConfirmResetUI(true); closeMenu(); }}>
              Reset To Defaults...
            </div>
            <div class="dropdown__separator" />
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
              <button class="dialog__button" onClick={() => setConfirmClearFavs(false)}>{"< Cancel >"}</button>
              <button class="dialog__button dialog__button--primary" onClick={async () => {
                await clearAllFavorites();
                setConfirmClearFavs(false);
                fetchGames();
              }}>{"< Clear All >"}</button>
            </div>
          </div>
        </div>
      </Show>

      {/* Confirm reset to defaults dialog */}
      <Show when={confirmResetUI()}>
        <div class="dialog-overlay" onClick={() => setConfirmResetUI(false)}>
          <div class="dialog" onClick={(e) => e.stopPropagation()}>
            <div class="dialog__title">Reset To Defaults</div>
            <div class="dialog__body">
              Reset all settings to factory defaults? This includes theme, zoom, layout, and filters.
            </div>
            <div class="dialog__footer">
              <button class="dialog__button" onClick={() => setConfirmResetUI(false)}>{"< Cancel >"}</button>
              <button class="dialog__button dialog__button--primary" onClick={doResetUI}>{"< Reset >"}</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
