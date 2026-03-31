import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render } from "solid-js/web";
import { StatusBar } from "../components/StatusBar";
import {
  setTotalCount,
  setScanning,
  setScanStatus,
} from "../lib/store";

let dispose: (() => void) | undefined;

beforeEach(() => {
  setTotalCount(0);
  setScanning(false);
  setScanStatus("");
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
});

describe("StatusBar", () => {
  it("shows the item count from the store", () => {
    setTotalCount(12345);
    dispose = render(() => <StatusBar />, document.body);
    expect(document.querySelector(".status-bar__info")?.textContent).toBe(
      "12,345 items"
    );
  });

  it("shows '0 items' when there are no games", () => {
    setTotalCount(0);
    dispose = render(() => <StatusBar />, document.body);
    expect(document.querySelector(".status-bar__info")?.textContent).toBe(
      "0 items"
    );
  });

  it("shows the scan status text when scanning is active", () => {
    setScanning(true);
    setScanStatus("Scanning MS-DOS.xml… 4,200 games");
    dispose = render(() => <StatusBar />, document.body);
    expect(document.querySelector(".status-bar__info")?.textContent).toBe(
      "Scanning MS-DOS.xml… 4,200 games"
    );
  });

  it("shows item count (not scan status) when not scanning", () => {
    setTotalCount(500);
    setScanning(false);
    setScanStatus("Old status text");
    dispose = render(() => <StatusBar />, document.body);
    expect(document.querySelector(".status-bar__info")?.textContent).toBe(
      "500 items"
    );
  });

  it("renders all hotkey hints", () => {
    dispose = render(() => <StatusBar />, document.body);
    const bar = document.querySelector(".status-bar") as HTMLElement;
    const text = bar.textContent ?? "";
    expect(text).toContain("Enter");
    expect(text).toContain("Launch");
    expect(text).toContain("Search");
    expect(text).toContain("Tab");
    expect(text).toContain("Fav");
    expect(text).toContain("Back");
  });
});
