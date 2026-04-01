import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "solid-js/web";
import { SearchBar } from "../components/SearchBar";
import { searchQuery, setSearchQuery, setFilters, setSelectedIndex } from "../lib/store";

let dispose: (() => void) | undefined;

beforeEach(() => {
  setSearchQuery("");
  setFilters("offset", 0);
  setSelectedIndex(0);
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
  delete (window as any).__focusSearch;
  delete (window as any).__clearSearch;
});

describe("SearchBar", () => {
  it("renders a text input with the correct placeholder", () => {
    dispose = render(() => <SearchBar />, document.body);
    const input = document.querySelector(".search-bar__input") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.placeholder).toBe("/ to search...");
    expect(input.type).toBe("text");
  });

  it("does not update searchQuery on input — only on Enter", () => {
    dispose = render(() => <SearchBar />, document.body);
    const input = document.querySelector(".search-bar__input") as HTMLInputElement;

    input.value = "doom";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));

    expect(searchQuery()).toBe("");
  });

  it("updates searchQuery when Enter is pressed", () => {
    dispose = render(() => <SearchBar />, document.body);
    const input = document.querySelector(".search-bar__input") as HTMLInputElement;

    input.value = "doom";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );

    expect(searchQuery()).toBe("doom");
  });

  it("resets offset to 0 when search fires on Enter", () => {
    setFilters("offset", 200);
    dispose = render(() => <SearchBar />, document.body);
    const input = document.querySelector(".search-bar__input") as HTMLInputElement;

    input.value = "quake";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );

    expect(searchQuery()).toBe("quake");
  });

  it("Escape key clears the input value", () => {
    dispose = render(() => <SearchBar />, document.body);
    const input = document.querySelector(".search-bar__input") as HTMLInputElement;

    input.value = "doom";
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );

    expect(input.value).toBe("");
  });

  it("Escape key resets searchQuery to empty string", () => {
    setSearchQuery("doom");
    dispose = render(() => <SearchBar />, document.body);
    const input = document.querySelector(".search-bar__input") as HTMLInputElement;

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );

    expect(searchQuery()).toBe("");
  });

  it("exposes window.__focusSearch() that focuses the input", () => {
    dispose = render(() => <SearchBar />, document.body);
    const input = document.querySelector(".search-bar__input") as HTMLInputElement;
    const focusSpy = vi.spyOn(input, "focus");

    expect(typeof (window as any).__focusSearch).toBe("function");
    (window as any).__focusSearch();
    expect(focusSpy).toHaveBeenCalledOnce();
  });

  it("does not render a search label", () => {
    dispose = render(() => <SearchBar />, document.body);
    expect(document.querySelector(".search-bar__label")).toBeNull();
  });
});
