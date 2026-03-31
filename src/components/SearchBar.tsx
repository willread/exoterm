import { Component } from "solid-js";
import { setSearchQuery, setFilters, setSelectedIndex } from "../lib/store";

export const SearchBar: Component = () => {
  let inputRef: HTMLInputElement | undefined;
  let debounceTimer: number | undefined;

  const handleInput = (value: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      setSearchQuery(value);
      setFilters("offset", 0);
      setSelectedIndex(0);
    }, 150);
  };

  // Expose focus method globally for keyboard shortcut
  (window as any).__focusSearch = () => inputRef?.focus();

  return (
    <div class="search-bar">
      <div class="search-bar__label">Search:</div>
      <input
        ref={inputRef}
        class="search-bar__input"
        type="text"
        onInput={(e) => handleInput(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setSearchQuery("");
            e.currentTarget.value = "";
            e.currentTarget.blur();
          }
        }}
        placeholder="Type to search..."
        spellcheck={false}
        autocomplete="off"
      />
    </div>
  );
};
