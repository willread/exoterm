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
