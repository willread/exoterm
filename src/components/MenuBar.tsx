import { Component, Show, onMount, onCleanup } from "solid-js";
import { activeMenu, setActiveMenu, setActiveDialog, theme, setTheme, crtEnabled, setCrtEnabled, fontSize, setFontSize } from "../lib/store";
import type { Theme } from "../lib/types";

const THEMES: { label: string; value: Theme }[] = [
  { label: "Blue (EDIT.COM)", value: "blue" },
  { label: "Black & White", value: "bw" },
  { label: "Amber Phosphor", value: "amber" },
  { label: "Green Phosphor", value: "green" },
];

export const MenuBar: Component = () => {
  let menuBarRef: HTMLDivElement | undefined;

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu() === menu ? null : menu);
  };

  const closeMenu = () => setActiveMenu(null);

  const handleDocumentClick = (e: MouseEvent) => {
    if (activeMenu() && menuBarRef && !menuBarRef.contains(e.target as Node)) {
      closeMenu();
    }
  };

  onMount(() => document.addEventListener("click", handleDocumentClick));
  onCleanup(() => document.removeEventListener("click", handleDocumentClick));

  const cycleTheme = () => {
    const current = theme();
    const idx = THEMES.findIndex((t) => t.value === current);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next.value);
    document.documentElement.setAttribute("data-theme", next.value);
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
            <div class="dropdown__item" onClick={cycleTheme}>
              Theme: {THEMES.find((t) => t.value === theme())?.label}
            </div>
            <div class="dropdown__item" onClick={() => { setCrtEnabled(!crtEnabled()); closeMenu(); }}>
              CRT Effects: {crtEnabled() ? "ON" : "OFF"}
            </div>
            <div class="dropdown__separator" />
            <div class="dropdown__item" onClick={() => {
              const next = Math.min(fontSize() + 2, 24);
              setFontSize(next);
              document.documentElement.style.setProperty("--font-size", next + "px");
              document.documentElement.style.setProperty("--char-h", next + "px");
            }}>
              Zoom In (+)
            </div>
            <div class="dropdown__item" onClick={() => {
              const next = Math.max(fontSize() - 2, 10);
              setFontSize(next);
              document.documentElement.style.setProperty("--font-size", next + "px");
              document.documentElement.style.setProperty("--char-h", next + "px");
            }}>
              Zoom Out (-)
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
              About eXo Terminal
            </div>
          </div>
        </Show>
      </div>

      {/* Center title — draggable area */}
      <div class="menu-bar__title" data-tauri-drag-region>eXo Terminal</div>

      {/* Window controls — DOS-style */}
      <div class="menu-bar__controls">
        <div class="menu-bar__control" onClick={handleMinimize} title="Minimize">_</div>
        <div class="menu-bar__control" onClick={handleMaximize} title="Maximize">{"\u25A1"}</div>
        <div class="menu-bar__control menu-bar__control--close" onClick={handleClose} title="Close">X</div>
      </div>
    </div>
  );
};
