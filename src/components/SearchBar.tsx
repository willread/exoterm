import { Component, Show, createSignal } from "solid-js";
import { setSearchQuery, setFilters, setSelectedIndex } from "../lib/store";

export const SearchBar: Component = () => {
  let inputRef: HTMLInputElement | undefined;
  let debounceTimer: number | undefined;
  const [hasText, setHasText] = createSignal(false);

  const handleInput = (value: string) => {
    setHasText(value.length > 0);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      setSearchQuery(value);
      setFilters("offset", 0);
      setSelectedIndex(0);
    }, 150);
  };

  const clearSearch = (refocus = true) => {
    // Cancel any pending debounce so stale query doesn't reapply
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
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
