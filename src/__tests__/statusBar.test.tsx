import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render } from "solid-js/web";
import { StatusBar } from "../components/StatusBar";
import {
  setScanning,
  setScanStatus,
  setActivePanel,
  setSearchFocused,
} from "../lib/store";

let dispose: (() => void) | undefined;

beforeEach(() => {
  setScanning(false);
  setScanStatus("");
  setActivePanel("list");
  setSearchFocused(false);
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
});

describe("StatusBar", () => {
  it("shows the scan status text when scanning is active", () => {
    setScanning(true);
    setScanStatus("Scanning MS-DOS.xml… 4,200 games");
    dispose = render(() => <StatusBar />, document.body);
    expect(document.querySelector(".status-bar__info")?.textContent).toBe(
      "Scanning MS-DOS.xml… 4,200 games"
    );
  });

  it("does not show item count when not scanning", () => {
    setScanning(false);
    dispose = render(() => <StatusBar />, document.body);
    expect(document.querySelector(".status-bar__info")).toBeNull();
  });

  it("renders hotkey hints for game list panel", () => {
    setActivePanel("list");
    dispose = render(() => <StatusBar />, document.body);
    const bar = document.querySelector(".status-bar") as HTMLElement;
    const text = bar.textContent ?? "";
    expect(text).toContain("Enter");
    expect(text).toContain("Launch");
    expect(text).toContain("Search");
    expect(text).toContain("Fav");
    expect(text).toContain("Navigate");
    expect(text).toContain("Filters");
  });

  it("does not render removed hotkey hints (F1, Tab, Esc)", () => {
    dispose = render(() => <StatusBar />, document.body);
    const bar = document.querySelector(".status-bar") as HTMLElement;
    const text = bar.textContent ?? "";
    expect(text).not.toContain("F1");
    expect(text).not.toContain("Tab");
    expect(text).not.toContain("Esc");
  });

  it("shows sidebar hints when activePanel is sidebar", () => {
    setActivePanel("sidebar");
    dispose = render(() => <StatusBar />, document.body);
    const bar = document.querySelector(".status-bar") as HTMLElement;
    const text = bar.textContent ?? "";
    expect(text).toContain("Enter");
    expect(text).toContain("Select");
    expect(text).toContain("Navigate");
    expect(text).toContain("Games");
    expect(text).not.toContain("Launch");
    expect(text).not.toContain("Fav");
  });

  it("shows search hints when search is focused", () => {
    setSearchFocused(true);
    dispose = render(() => <StatusBar />, document.body);
    const bar = document.querySelector(".status-bar") as HTMLElement;
    const text = bar.textContent ?? "";
    expect(text).toContain("Enter");
    expect(text).toContain("Search");
    expect(text).toContain("Esc");
    expect(text).toContain("Clear");
    expect(text).not.toContain("Launch");
    expect(text).not.toContain("Fav");
  });

  it("search focused hints take priority over sidebar hints", () => {
    setActivePanel("sidebar");
    setSearchFocused(true);
    dispose = render(() => <StatusBar />, document.body);
    const bar = document.querySelector(".status-bar") as HTMLElement;
    const text = bar.textContent ?? "";
    expect(text).toContain("Esc");
    expect(text).toContain("Clear");
    expect(text).not.toContain("Select");
  });
});
