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
  // Reset data-theme attribute
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
      "eXo Terminal"
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

    // Click outside — document body, which is not inside the menu bar
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
    expect(activeMenu()).toBeNull(); // menu closes after selection
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

  it("shows current theme name in the Theme item", () => {
    setTheme("amber");
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    const themeItem = Array.from(document.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.startsWith("Theme:")
    );
    expect(themeItem?.textContent).toContain("Amber Phosphor");
  });

  it("clicking Theme cycles from blue → bw", () => {
    setTheme("blue");
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    const themeItem = Array.from(document.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.startsWith("Theme:")
    ) as HTMLElement;
    themeItem.click();
    expect(theme()).toBe("bw");
  });

  it("clicking Theme cycles from bw → amber", () => {
    setTheme("bw");
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    const themeItem = Array.from(document.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.startsWith("Theme:")
    ) as HTMLElement;
    themeItem.click();
    expect(theme()).toBe("amber");
  });

  it("clicking Theme cycles from green → blue (wraps around)", () => {
    setTheme("green");
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    const themeItem = Array.from(document.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.startsWith("Theme:")
    ) as HTMLElement;
    themeItem.click();
    expect(theme()).toBe("blue");
  });

  it("cycling theme updates data-theme attribute on documentElement", () => {
    setTheme("blue");
    dispose = render(() => <MenuBar />, document.body);
    openOptionsMenu();
    const themeItem = Array.from(document.querySelectorAll(".dropdown__item")).find((i) =>
      i.textContent?.startsWith("Theme:")
    ) as HTMLElement;
    themeItem.click();
    expect(document.documentElement.getAttribute("data-theme")).toBe("bw");
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

// ── Help menu items ────────────────────────────────────────────────────────────

describe("MenuBar Help menu", () => {
  it("'About eXo Terminal' sets activeDialog to 'about'", () => {
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
