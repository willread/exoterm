# exoterm

A DOS-looking frontend for browsing and launching [eXo](https://exodos.the-eye.us/) game collections.

<img width="2244" height="1404" alt="image" src="https://github.com/user-attachments/assets/1c44bc9b-f46d-49c1-be35-f15aa7288dd3" />

Built with Tauri 2, SolidJS, and way too much nostalgia.

## What it does

Point it at your eXoDOS (or eXoWin9x, etc.) folder and it scans the LaunchBox XML metadata into a local SQLite database. Then you get a fast, searchable, filterable game browser with edit.com vibes.

- Fast full-text search
- Filter by platform, genre, year, developer, publisher, series
- 4 color themes (Big Blue, Black & White, Amber Phosphor, Green Phosphor)
- Optional CRT shader (scanlines, screen curvature, phosphor glow)
- Favorites
- Keyboard-driven — arrow keys, `/` to search, `Enter` to launch

## Build

Needs [Rust](https://rustup.rs/) and [Node.js](https://nodejs.org/).

```
npm install
npm run dev     # dev mode with hot reload
npm run package # standalone .exe + installer
```

## Keys

| Key | What it does |
|-----|-------------|
| `Enter` | Launch selected game |
| `Up/Down` | Navigate game list |
| `PgUp/PgDn` | Page through list |
| `Home/End` | Jump to first/last |
| `/` or `Ctrl+F` | Focus search bar |
| `Enter` (in search) | Execute search |
| `Esc` | Clear search + filters |
| `F` | Toggle favorite |
| `Alt+F/O/T/H` | Open menus |
