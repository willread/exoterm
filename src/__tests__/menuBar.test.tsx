import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "solid-js/web";
import { MenuBar } from "../components/MenuBar";
import {
  activeMenu,
  setActiveMenu,
  activeDialog,
  setActiveDialog,
  theme,
  setTheme,
  crtEnabled,
  setCrtEnabled,
} from "../lib/store";

let dispose: (() => void) | undefined;

beforeEach(() => {
  setActiveMenu(null);
  setActiveDialog(null);
  setTheme("blue");
  setCrtEnabled(true);
  document.documentElement.setAttribute("data-theme", "blue");
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
});

// ── Basic rendering ────────────────────────────────────────────────────────────

describe("MenuBar rendering", () => {
  it("renders the app title in the center", () => {
    dispose = render(() => <MenuBar />, document.body);
    expect(document.querySelector(".menu-bar__title")?.textContent).toBe(
      "exoterm"
    );
  });

  it("renders all three menu labels", () => {
    dispose = render(() => <MenuBar />, document.body);
    const items = document.querySelectorAll(".menu-bar__item");
    const texts = Array.from(items).map((i) => i.textContent?.trim());
    expect(texts.some((t) => t?.includes("ile"))).toBe(true); // "File"
    expect(texts.some((t) => t?.includes("ptions"))).toBe(true); // "Options"
    expect(texts.some((t) => t?.includes("elp"))).toBe(true); // "Help"
  });

  it("renders window controls", () => {
    dispose = render(() => <MenuBar />, document.body);
    const controls = document.querySelectorAll(".menu-bar__control");
    expect(controls.length).toBe(3);
  });
});

// ── Dropdown open/close ────────────────────────────────────────────────────────

describe("MenuBar dropdown toggle", () => {
  it("clicking File opens the File dropdown", () => {
    dispose = render(() => <MenuBar />, document.body);
    const fileItem = Array.from(document.querySelectorAll(".menu-bar__item")).find((i) =>
      i.textContent?.includes("ile")
    ) as HTMLElement;
    fileItem.click();
    expect(activeMenu()).toBe("file");
    expect(document.querySelector(".dropdown")).not.toBeNull();
  });

  it("clicking File again closes the dropdown", () => {
    dispose = render(() => <MenuBar />, document.body);
    const fileItem = Array.from(document.querySelectorAll(".menu-bar__item")).find((i) =>
      i.textContent?.includes("ile")
    ) as HTMLElement;
    fileItem.click(); // open
    fileItem.click(); // close
    expect(activeMenu()).toBeNull();
    expect(document.querySelector(".dropdown")).toBeNull();
  });

  it("clicking a different menu closes the first and opens the second", () => {
    dispose = render(() => <MenuBar />, document.body);
    const items = Array.from(document.querySelectorAll(".menu-bar__item"));
    const fileItem = items.find((i) => i.textContent?.includes("ile")) as HTMLElement;
    const optionsItem = items.find((i) => i.textContent?.includes("ptions")) as HTMLElement;

    fileItem.click();
    expect(activeMenu()).toBe("file");

    optionsItem.click();
    expect(activeMenu()).toBe("options");
  });

  it("clicking outside the menu bar closes the open dropdown", () => {
    dispose = render(() => <MenuBar />, document.body);
    const fileItem = Array.from(document.querySelectorAll(".menu-bar__item")).find((i) =>
      i.textContent?.includes("ile")
    ) as HTMLElement;
    fileItem.click();
    expect(activeMenu()).toBe("file");

    document.body.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );
    expect(activeMenu()).toBeNull();
  });

  it("active menu item has the active CSS class", () => {
    dispose = render(() => <MenuBar />, document.body);
    const fileItem = Array.from(document.querySelectorAll(".menu-bar__item")).find((i) =>
      i.textContent?.includes("ile")
    ) as HTMLElement;
    fileItem.click();
    expect(fileItem.classList.contains("menu-bar__item--active")).toBe(true);
  });
});

// ── File menu items ────────────────────────────────────────────────────────────

describe("MenuBar File menu", () => {
  function openFileMenu() {
    const fileItem = Array.from(document.querySelectorAll(".menu-bar__item")).find((i) =>
      i.textContent?.includes("ile")
    ) as HTMLElement;
    fileItem.click();
  }

  it("'Manage Collections...' sets activeDialog to 'manage-collections'", () => {
    dispose = render(() => <MenuBar />, document.body);
    openFileMenu();
    const items = document.querySelectorAll(".dropdown__item");
    const manageItem = Array.from(items).find((i) =>
      i.textContent?.includes("Manage Collections")
    ) as HTMLElement;
    manageItem.click();
    expect(activeDialog()).toBe("manage-collections");
    expect(activeMenu()).toBeNull();
  });

  it("'Add Collection...' sets activeDialog to 'collections'", () => {
    dispose = render(() => <MenuBar />, document.body);
    openFileMenu();
    const items = document.querySelectorAll(".dropdown__item");
    const addItem = Array.from(items).find((i) =>
      i.textContent?.includes("Add Collection")
    ) as HTMLElement;
    addItem.click();
    expect(activeDialog()).toBe("collections");
    expect(activeMenu()).toBeNull();
  });
});

// ── Options menu items ─────────────────────────────────────────────────────────

describe("MenuBar Options menu", () => {
  function openOptionsMenu() {
    const optItem = Array.from(document.querySelectorAll(".menu-bar__item")).find((i) =>
      i.textContent?.includes("ptions")
    ) as HTMLElement;
    optItem.click();
  }

  it("shows Theme submenu item", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    const themeItem = Array.from(document.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.includes("Theme")
    );
    expect(themeItem).not.toBeUndefined();
  });

  it("shows 'CRT Effects: ON' when crtEnabled is true", () => {
    setCrtEnabled(true);
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    const crtItem = Array.from(document.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.startsWith("CRT Effects:")
    );
    expect(crtItem?.textContent).toContain("ON");
  });

  it("shows 'CRT Effects: OFF' when crtEnabled is false", () => {
    setCrtEnabled(false);
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    const crtItem = Array.from(document.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.startsWith("CRT Effects:")
    );
    expect(crtItem?.textContent).toContain("OFF");
  });

  it("clicking CRT Effects toggles crtEnabled from true to false", () => {
    setCrtEnabled(true);
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    const crtItem = Array.from(document.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.startsWith("CRT Effects:")
    ) as HTMLElement;
    crtItem.click();
    expect(crtEnabled()).toBe(false);
  });

  it("clicking CRT Effects toggles crtEnabled from false to true", () => {
    setCrtEnabled(false);
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    const crtItem = Array.from(document.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.startsWith("CRT Effects:")
    ) as HTMLElement;
    crtItem.click();
    expect(crtEnabled()).toBe(true);
  });
});

// ── Theme submenu ──────────────────────────────────────────────────────────────

describe("MenuBar Theme submenu", () => {
  function openThemeSubmenu() {
    const optItem = Array.from(document.querySelectorAll(".menu-bar__item")).find((i) =>
      i.textContent?.includes("ptions")
    ) as HTMLElement;
    optItem.click();
    // Hover the Theme item to open the submenu
    const themeItem = Array.from(document.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.trim() === "Theme"
    ) as HTMLElement;
    themeItem.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    return themeItem;
  }

  it("lists all 6 themes in the submenu", () => {
    dispose = render(() => <MenuBar />, document.body);
    openThemeSubmenu();
    const submenu = document.querySelector(".dropdown--submenu");
    expect(submenu).not.toBeNull();
    const items = submenu!.querySelectorAll(".dropdown__item");
    const labels = Array.from(items).map((i) => i.textContent?.replace(/^\s*✓?\s*/, "").trim());
    expect(labels).toContain("Big Blue");
    expect(labels).toContain("Black & White");
    expect(labels).toContain("Amber Phosphor");
    expect(labels).toContain("Green Phosphor");
    expect(labels).toContain("Windows 95");
    expect(labels).toContain("Windows 3.x");
  });

  it("checkmark appears on the active theme and not others", () => {
    setTheme("blue");
    dispose = render(() => <MenuBar />, document.body);
    openThemeSubmenu();
    const submenu = document.querySelector(".dropdown--submenu")!;
    const items = Array.from(submenu.querySelectorAll(".dropdown__item"));
    const checks = items.map((i) => i.querySelector(".dropdown__check")?.textContent);
    const labels = items.map((i) =>
      i.textContent?.replace(/^\s*[✓ ]\s*/, "").trim()
    );
    const blueIdx = labels.findIndex((l) => l === "Big Blue");
    expect(checks[blueIdx]).toBe("✓");
    // All others should not have the checkmark
    checks.forEach((c, i) => {
      if (i !== blueIdx) expect(c).not.toBe("✓");
    });
  });

  it("clicking Windows 95 sets theme to win95", () => {
    dispose = render(() => <MenuBar />, document.body);
    openThemeSubmenu();
    const submenu = document.querySelector(".dropdown--submenu")!;
    const win95Item = Array.from(submenu.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.includes("Windows 95")
    ) as HTMLElement;
    win95Item.click();
    expect(theme()).toBe("win95");
  });

  it("clicking Windows 3.x sets theme to win3x", () => {
    dispose = render(() => <MenuBar />, document.body);
    openThemeSubmenu();
    const submenu = document.querySelector(".dropdown--submenu")!;
    const win3xItem = Array.from(submenu.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.includes("Windows 3.x")
    ) as HTMLElement;
    win3xItem.click();
    expect(theme()).toBe("win3x");
  });

  it("theme items each have a dropdown__check span for alignment", () => {
    dispose = render(() => <MenuBar />, document.body);
    openThemeSubmenu();
    const submenu = document.querySelector(".dropdown--submenu")!;
    const items = submenu.querySelectorAll(".dropdown__item");
    items.forEach((item) => {
      expect(item.querySelector(".dropdown__check")).not.toBeNull();
    });
  });
});

// ── Help menu items ────────────────────────────────────────────────────────────

describe("MenuBar Help menu", () => {
  it("'About exoterm' sets activeDialog to 'about'", () => {
    dispose = render(() => <MenuBar />, document.body);
    const helpItem = Array.from(document.querySelectorAll(".menu-bar__item")).find((i) =>
      i.textContent?.includes("elp")
    ) as HTMLElement;
    helpItem.click();
    const aboutItem = Array.from(document.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.includes("About")
    ) as HTMLElement;
    aboutItem.click();
    expect(activeDialog()).toBe("about");
    expect(activeMenu()).toBeNull();
  });
});

// ── Dropdown keyboard navigation ───────────────────────────────────────────────

describe("MenuBar dropdown keyboard navigation", () => {
  function openFileMenu() {
    const fileItem = Array.from(document.querySelectorAll(".menu-bar__item")).find((i) =>
      i.textContent?.includes("ile")
    ) as HTMLElement;
    fileItem.click();
  }

  function fireKey(key: string) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, capture: true } as any)
    );
  }

  it("ArrowDown moves focus to the first item when nothing is focused", () => {
    dispose = render(() => <MenuBar />, document.body);
    openFileMenu();
    fireKey("ArrowDown");
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".dropdown:not(.dropdown--submenu) > .dropdown__item"
      )
    );
    expect(items[0].classList.contains("dropdown__item--focused")).toBe(true);
    expect(items.slice(1).every((el) => !el.classList.contains("dropdown__item--focused"))).toBe(true);
  });

  it("ArrowDown followed by ArrowDown moves focus to the second item", () => {
    dispose = render(() => <MenuBar />, document.body);
    openFileMenu();
    fireKey("ArrowDown");
    fireKey("ArrowDown");
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".dropdown:not(.dropdown--submenu) > .dropdown__item"
      )
    );
    expect(items[0].classList.contains("dropdown__item--focused")).toBe(false);
    expect(items[1].classList.contains("dropdown__item--focused")).toBe(true);
  });

  it("ArrowUp does not go below index 0", () => {
    dispose = render(() => <MenuBar />, document.body);
    openFileMenu();
    fireKey("ArrowUp"); // already at -1, clamp to 0
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".dropdown:not(.dropdown--submenu) > .dropdown__item"
      )
    );
    // Focus should be on first item (clamped)
    expect(items[0].classList.contains("dropdown__item--focused")).toBe(true);
  });

  it("ArrowDown does not go past the last item", () => {
    dispose = render(() => <MenuBar />, document.body);
    openFileMenu();
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".dropdown:not(.dropdown--submenu) > .dropdown__item"
      )
    );
    // Press down more times than there are items
    for (let i = 0; i < items.length + 5; i++) fireKey("ArrowDown");
    expect(items[items.length - 1].classList.contains("dropdown__item--focused")).toBe(true);
  });

  it("Enter activates the focused item", () => {
    dispose = render(() => <MenuBar />, document.body);
    openFileMenu();
    // Navigate to 'Add Collection...' (second item)
    fireKey("ArrowDown"); // index 0 = Manage Collections
    fireKey("ArrowDown"); // index 1 = Add Collection
    fireKey("Enter");
    // Enter should have clicked 'Add Collection...' → sets activeDialog
    expect(activeDialog()).toBe("collections");
    expect(activeMenu()).toBeNull();
  });

  it("focused index resets to -1 when a different menu opens", () => {
    dispose = render(() => <MenuBar />, document.body);
    openFileMenu();
    fireKey("ArrowDown"); // focus index 0
    // Now open a different menu
    const helpItem = Array.from(document.querySelectorAll(".menu-bar__item")).find((i) =>
      i.textContent?.includes("elp")
    ) as HTMLElement;
    helpItem.click();
    // No focused item in the new menu
    const focusedItems = document.querySelectorAll(".dropdown__item--focused");
    expect(focusedItems.length).toBe(0);
  });

  it("keyboard events do nothing when no menu is open", () => {
    dispose = render(() => <MenuBar />, document.body);
    // No menu open; ArrowDown should not throw or affect state
    fireKey("ArrowDown");
    expect(activeMenu()).toBeNull();
    expect(document.querySelectorAll(".dropdown__item--focused").length).toBe(0);
  });
});

// ── Left/Right arrow navigation between menus ──────────────────────────────────

describe("MenuBar Left/Right arrow navigation between menus", () => {
  function fireKey(key: string) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, capture: true } as any)
    );
  }

  it("ArrowRight moves from File to Options", () => {
    setActiveMenu("file");
    dispose = render(() => <MenuBar />, document.body);
    fireKey("ArrowRight");
    expect(activeMenu()).toBe("options");
  });

  it("ArrowLeft moves from Options to File", () => {
    setActiveMenu("options");
    dispose = render(() => <MenuBar />, document.body);
    fireKey("ArrowLeft");
    expect(activeMenu()).toBe("file");
  });

  it("ArrowRight wraps from Help to File", () => {
    setActiveMenu("help");
    dispose = render(() => <MenuBar />, document.body);
    fireKey("ArrowRight");
    expect(activeMenu()).toBe("file");
  });

  it("ArrowLeft wraps from File to Help", () => {
    setActiveMenu("file");
    dispose = render(() => <MenuBar />, document.body);
    fireKey("ArrowLeft");
    expect(activeMenu()).toBe("help");
  });

  it("switching menus with arrow resets the focused item index", () => {
    setActiveMenu("file");
    dispose = render(() => <MenuBar />, document.body);
    fireKey("ArrowDown"); // focus index 0
    fireKey("ArrowRight"); // switch to options menu
    const focusedItems = document.querySelectorAll(".dropdown__item--focused");
    expect(focusedItems.length).toBe(0);
  });
});

// ── Alt+key shortcuts ──────────────────────────────────────────────────────────

describe("MenuBar Alt+key shortcuts", () => {
  function fireAltKey(key: string) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key, altKey: true, bubbles: true, cancelable: true } as any)
    );
  }

  it("Alt+F opens the File menu", () => {
    dispose = render(() => <MenuBar />, document.body);
    fireAltKey("f");
    expect(activeMenu()).toBe("file");
  });

  it("Alt+O opens the Options menu", () => {
    dispose = render(() => <MenuBar />, document.body);
    fireAltKey("o");
    expect(activeMenu()).toBe("options");
  });

  it("Alt+T opens the Tools menu", () => {
    dispose = render(() => <MenuBar />, document.body);
    fireAltKey("t");
    expect(activeMenu()).toBe("tools");
  });

  it("Alt+H opens the Help menu", () => {
    dispose = render(() => <MenuBar />, document.body);
    fireAltKey("h");
    expect(activeMenu()).toBe("help");
  });

  it("Alt+F closes the File menu if already open", () => {
    setActiveMenu("file");
    dispose = render(() => <MenuBar />, document.body);
    fireAltKey("f");
    expect(activeMenu()).toBeNull();
  });

  it("Alt+key works when no menu is currently open", () => {
    dispose = render(() => <MenuBar />, document.body);
    expect(activeMenu()).toBeNull();
    fireAltKey("o");
    expect(activeMenu()).toBe("options");
  });
});

// ── Submenu keyboard navigation ─────────────────────────────────────────────

describe("MenuBar submenu keyboard navigation", () => {
  function openOptionsMenu() {
    const optItem = Array.from(document.querySelectorAll(".menu-bar__item")).find((i) =>
      i.textContent?.includes("ptions")
    ) as HTMLElement;
    optItem.click();
  }

  function fireKey(key: string) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, capture: true } as any)
    );
  }

  it("ArrowDown reaches the Theme submenu trigger in Options menu", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // index 0 = Theme
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(".dropdown:not(.dropdown--submenu) > .dropdown__item")
    );
    expect(items[0].classList.contains("dropdown__item--focused")).toBe(true);
    expect(items[0].classList.contains("dropdown__item--submenu")).toBe(true);
  });

  it("ArrowDown traverses past Theme to CRT Effects", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme
    fireKey("ArrowDown"); // CRT Effects
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(".dropdown:not(.dropdown--submenu) > .dropdown__item")
    );
    expect(items[0].classList.contains("dropdown__item--focused")).toBe(false);
    expect(items[1].classList.contains("dropdown__item--focused")).toBe(true);
    expect(items[1].textContent).toContain("CRT Effects");
  });

  it("Enter on Theme opens the submenu and focuses first theme item", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme
    fireKey("Enter");
    const submenu = document.querySelector(".dropdown--submenu");
    expect(submenu).not.toBeNull();
    const subItems = submenu!.querySelectorAll(".dropdown__item");
    expect(subItems[0].classList.contains("dropdown__item--focused")).toBe(true);
    expect(subItems[0].textContent).toContain("Big Blue");
  });

  it("ArrowRight on Theme opens the submenu", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme
    fireKey("ArrowRight");
    const submenu = document.querySelector(".dropdown--submenu");
    expect(submenu).not.toBeNull();
    const subItems = submenu!.querySelectorAll(".dropdown__item");
    expect(subItems[0].classList.contains("dropdown__item--focused")).toBe(true);
  });

  it("ArrowDown navigates within the open submenu", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme
    fireKey("Enter"); // open submenu, focus index 0
    fireKey("ArrowDown"); // submenu index 1
    const subItems = document.querySelectorAll<HTMLElement>(".dropdown--submenu > .dropdown__item");
    expect(subItems[0].classList.contains("dropdown__item--focused")).toBe(false);
    expect(subItems[1].classList.contains("dropdown__item--focused")).toBe(true);
    expect(subItems[1].textContent).toContain("Black & White");
  });

  it("ArrowUp navigates within the open submenu", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme
    fireKey("Enter"); // submenu index 0
    fireKey("ArrowDown"); // submenu index 1
    fireKey("ArrowDown"); // submenu index 2
    fireKey("ArrowUp"); // back to submenu index 1
    const subItems = document.querySelectorAll<HTMLElement>(".dropdown--submenu > .dropdown__item");
    expect(subItems[1].classList.contains("dropdown__item--focused")).toBe(true);
  });

  it("ArrowDown does not go past the last submenu item", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme
    fireKey("Enter"); // open submenu
    for (let i = 0; i < 20; i++) fireKey("ArrowDown"); // way past end
    const subItems = document.querySelectorAll<HTMLElement>(".dropdown--submenu > .dropdown__item");
    expect(subItems[subItems.length - 1].classList.contains("dropdown__item--focused")).toBe(true);
  });

  it("ArrowUp does not go above the first submenu item", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme
    fireKey("Enter"); // submenu index 0
    fireKey("ArrowUp"); // should stay at 0
    const subItems = document.querySelectorAll<HTMLElement>(".dropdown--submenu > .dropdown__item");
    expect(subItems[0].classList.contains("dropdown__item--focused")).toBe(true);
  });

  it("Enter on a submenu item selects the theme and closes the menu", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme
    fireKey("Enter"); // open submenu, index 0
    // Navigate to "Windows 95" (index 4)
    fireKey("ArrowDown"); // 1
    fireKey("ArrowDown"); // 2
    fireKey("ArrowDown"); // 3
    fireKey("ArrowDown"); // 4
    fireKey("Enter");
    expect(theme()).toBe("win95");
    expect(activeMenu()).toBeNull();
  });

  it("Escape in submenu returns to parent with Theme still focused", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme
    fireKey("Enter"); // open submenu
    fireKey("Escape"); // return to parent
    // Submenu should be gone
    expect(document.querySelector(".dropdown--submenu")).toBeNull();
    // Options menu still open
    expect(activeMenu()).toBe("options");
    // Theme item should still be focused in parent
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(".dropdown:not(.dropdown--submenu) > .dropdown__item")
    );
    expect(items[0].classList.contains("dropdown__item--focused")).toBe(true);
    expect(items[0].textContent).toContain("Theme");
  });

  it("ArrowLeft in submenu returns to parent", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme
    fireKey("ArrowRight"); // open submenu
    fireKey("ArrowLeft"); // return to parent
    expect(document.querySelector(".dropdown--submenu")).toBeNull();
    expect(activeMenu()).toBe("options");
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(".dropdown:not(.dropdown--submenu) > .dropdown__item")
    );
    expect(items[0].classList.contains("dropdown__item--focused")).toBe(true);
  });

  it("after returning from submenu, ArrowDown continues in parent", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme (index 0)
    fireKey("Enter"); // open submenu
    fireKey("Escape"); // return to parent, still on Theme (index 0)
    fireKey("ArrowDown"); // CRT Effects (index 1)
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(".dropdown:not(.dropdown--submenu) > .dropdown__item")
    );
    expect(items[1].classList.contains("dropdown__item--focused")).toBe(true);
    expect(items[1].textContent).toContain("CRT Effects");
  });

  it("ArrowRight on a non-submenu item still switches menus", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme
    fireKey("ArrowDown"); // CRT Effects
    fireKey("ArrowRight"); // switch to next menu (Tools)
    expect(activeMenu()).toBe("tools");
  });

  it("ArrowLeft on a parent item still switches menus", () => {
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    fireKey("ArrowDown"); // Theme
    fireKey("ArrowLeft"); // switch to previous menu (File)
    expect(activeMenu()).toBe("file");
  });
});
