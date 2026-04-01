# exoterm

A DOS-style alternate frontend for eXo collections (eXoDOS, eXoWin9x, etc.) built with Tauri 2.

## Design Decisions

### Aesthetic
- **MS-DOS EDIT.COM look**: Blue background, menu bar at top, status bar at bottom, box-drawing borders
- **Custom titlebar**: Native window decorations disabled; menu bar serves as draggable titlebar with DOS-style window controls (_, box, X) at top right
- **4 themes**: Blue (default EDIT.COM), Black & White, Amber Phosphor, Green Phosphor
- **CRT effects**: Dramatic fullscreen shader — thick scanlines, heavy vignette, RGB sub-pixel simulation, screen curvature via perspective transform, phosphor glow, screen jitter, and a turn-on animation. Toggleable via Options menu
- **IBM VGA 9x16 font**: Authentic DOS typography from int10h.org oldschool PC font pack

### Architecture
- **Tauri 2**: Rust backend + SolidJS web frontend
- **Tauri v2 command convention**: `#[tauri::command]` defaults to camelCase parameter deserialization. Our commands use `rename_all = "snake_case"` so the JS invoke calls can pass snake_case keys (e.g. `sort_by`, `content_type`)
- **SQLite + FTS5**: Local database built by scanning LaunchBox XML metadata files. FTS5 provides instant prefix search across 162K+ games
- **quick-xml streaming parser**: Handles the massive per-platform XML files in `Data/Platforms/` without loading them entirely into memory
- **Per-platform XML files**: We parse `Data/Platforms/*.xml` (e.g., `MS-DOS.xml`, `MS-DOS Books.xml`) which contain full game records with ApplicationPath, Favorite, RootFolder, etc.

### Data Model
- eXo collections store metadata in LaunchBox XML format
- Game entries include: Title, Platform, Developer, Publisher, ReleaseDate, Genre, ApplicationPath, RootFolder, Favorite, Notes/Overview
- Content types detected from platform XML filename: Game, Magazine, Book, Soundtrack, Video, Catalog
- Database stored in `%APPDATA%/exo-terminal/exo_terminal.db`

### Filter Panel Design
- **Content type selector** at top of sidebar: shows all available types (Game, Magazine, Book, Soundtrack, Video, Catalog) plus "All"; click to filter
- **Favorites toggle**: clickable header to filter to favorites only
- **Single-select filters**: each category (Platform, Genre, Year, Developer, Publisher, Series) allows one selection; click again to deselect
- **Cascading filter options**: `get_filter_options` accepts all active filters; each category's available values are filtered by all OTHER active categories (so selecting a genre narrows the year/developer/etc. lists to only those with matching games)
- **Collapsible sections**: Platform starts expanded; Genre, Year, Developer, Publisher, Series start collapsed
- **Header label format**: "Category" when empty, "Category: value" when a selection exists
- **Genre nesting**: genres containing " / " separator are grouped under their parent with collapsible sub-groups
- **Reset Filters button**: clears all category filters and favoritesOnly
- **Sidebar scrolls as whole** — block layout, no sub-section overflow

### Game Launch
- Games launch via `cmd /C start cmd /C <batch_file>` — opens a real CMD window so the user can interact with CHOICE prompts, config menus, etc. natively
- Working directory set to game's root folder (or batch file's parent if no root_folder in XML)
- `kill_game` uses `taskkill /F /T` for process tree cleanup
- `game-exited` event fires when the launcher process exits

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
| `Alt+F/O/H` | Open menus |
