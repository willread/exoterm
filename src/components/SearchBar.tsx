import { Component, Show, createSignal } from "solid-js";
import { setSearchQuery, setFilters, setSelectedIndex } from "../lib/store";

export const SearchBar: Component = () => {
  let inputRef: HTMLInputElement | undefined;
  const [hasText, setHasText] = createSignal(false);

  const handleInput = (value: string) => {
    setHasText(value.length > 0);
  };

  const commitSearch = (value: string) => {
    setSearchQuery(value);
    setFilters("offset", 0);
    setSelectedIndex(0);
  };

  const clearSearch = (refocus = true) => {
    if (inputRef) {
      inputRef.value = "";
      if (refocus) inputRef.focus();
    }
    setHasText(false);
    setSearchQuery("");
    setFilters("offset", 0);
    setSelectedIndex(0);
  };

  // Expose focus and clear methods globally for keyboard shortcuts
  (window as any).__focusSearch = () => inputRef?.focus();
  (window as any).__clearSearch = () => clearSearch(false);

  return (
    <div class="search-bar" onClick={() => inputRef?.focus()}>
      <div class="search-bar__label">Search:</div>
      <input
        ref={inputRef}
        class="search-bar__input"
        type="text"
        onInput={(e) => handleInput(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            clearSearch();
            e.currentTarget.blur();
          } else if (e.key === "Enter") {
            commitSearch(e.currentTarget.value);
            e.currentTarget.blur();
          }
        }}
        placeholder="Type to search..."
        spellcheck={false}
        autocomplete="off"
      />
      <Show when={hasText()}>
        <span class="search-bar__clear" onClick={(e) => { e.stopPropagation(); clearSearch(); }} title="Clear search">x</span>
      </Show>
    </div>
  );
};
