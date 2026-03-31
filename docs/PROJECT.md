# eXo Terminal

A DOS-style alternate frontend for eXo collections (eXoDOS, eXoWin9x, etc.) built with Tauri 2.

## Design Decisions

### Aesthetic
- **MS-DOS EDIT.COM look**: Blue background, menu bar at top, status bar at bottom, box-drawing borders
- **4 themes**: Blue (default EDIT.COM), Black & White, Amber Phosphor, Green Phosphor
- **CRT effects**: Scanlines, phosphor glow, vignette - toggleable via Options menu
- **IBM VGA 9x16 font**: Authentic DOS typography from int10h.org oldschool PC font pack

### Architecture
- **Tauri 2**: Rust backend + SolidJS web frontend
- **SQLite + FTS5**: Local database built by scanning LaunchBox XML metadata files. FTS5 provides instant prefix search across 162K+ games
- **quick-xml streaming parser**: Handles the massive per-platform XML files in `Data/Platforms/` without loading them entirely into memory
- **Per-platform XML files**: We parse `Data/Platforms/*.xml` (e.g., `MS-DOS.xml`, `MS-DOS Books.xml`) which contain full game records with ApplicationPath, Favorite, RootFolder, etc.

### Data Model
- eXo collections store metadata in LaunchBox XML format
- Game entries include: Title, Platform, Developer, Publisher, ReleaseDate, Genre, ApplicationPath, RootFolder, Favorite, Notes/Overview
- Content types detected from platform XML filename: Game, Magazine, Book, Soundtrack, Video, Catalog
- Database stored in `%APPDATA%/exo-terminal/exo_terminal.db`

### Filter Panel Design
- **No content-type tabs** — sidebar shows filter sections only
- **Collapsible sections**: Platform starts expanded; Genre, Year, Developer, Publisher, Series start collapsed
- **Multi-select**: each category allows selecting multiple values (OR semantics); arrays passed to backend
- **Header label format**: "Category" when empty, "Category: val1, val2" when selections exist
- **Genre nesting**: genres containing " / " separator are grouped under their parent with collapsible sub-groups
- **Reset Filters button**: appears at top of sidebar whenever any filter array is non-empty or favoritesOnly is true
- **No LIMIT** on filter option queries — all distinct values shown in alphabetical order
- **Sidebar scrolls as whole** — block layout, no sub-section overflow

### Favorites
- Read from LaunchBox XML `<Favorite>` field during scan
- Toggle updates SQLite immediately
- Batch sync back to LaunchBox XML planned (File > Sync Favorites)

### Collections
- Configurable directories for each eXo collection
- Prompted on first run if none configured
- Each collection scanned from `Data/Platforms/*.xml`
- Multiple collections supported simultaneously

## Tech Stack
- Tauri 2 (Rust + WebView)
- SolidJS + TypeScript (frontend)
- Vite (bundler)
- rusqlite with FTS5 (search)
- quick-xml (XML parsing)
- Pure CSS (DOS aesthetic, CRT effects, themes)

## Testing
- Vitest + happy-dom for unit and component tests
- `vite-plugin-solid` included in `vitest.config.ts` with `hot: false` to enable JSX in tests without triggering solid-refresh HMR
- Component tests use `render` from `solid-js/web` directly (no separate testing library)
- Test files cover all user-facing functionality:
  - **Commands**: `commands.test.ts`, `commands-remaining.test.ts` — all 14 Tauri IPC wrappers
  - **Store**: `store.test.ts`, `filterEdgeCases.test.ts` — `fetchGames` param mapping for every filter/sort/pagination field (multi-select arrays), all 6 content types, combined filter scenarios, search query edge cases
  - **Keyboard**: `keyboard.test.ts`, `guardedLaunch.test.ts` — dispatch logic, context matching, INPUT element passthrough, debounce guard
  - **Filter logic**: `filters.test.ts` — param building, sort toggle, sort indicators
  - **Components**: `dialog.test.tsx`, `statusBar.test.tsx`, `gameList.test.tsx`, `searchBar.test.tsx`, `filterPanel.test.tsx`, `menuBar.test.tsx`, `collectionPicker.test.tsx`

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `/` or `Ctrl+F` | Focus search |
| `Enter` | Launch game |
| `Esc` | Clear search / close dialog |
| `F` | Toggle favorite |
| `Up/Down` | Navigate list |
| `PgUp/PgDn` | Page through list |
| `Home/End` | Jump to first/last |
| `Alt+F/V/O/H` | Open menus |
