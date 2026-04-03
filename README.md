# exoterm

A DOS-looking frontend for browsing and launching [eXo](https://www.retro-exo.com/) game collections.

<img width="2244" height="1404" alt="image" src="https://github.com/user-attachments/assets/d4d4ed13-eba1-4b2a-bd7e-00f8c36dd1f5" />

Built with Tauri 2, SolidJS, and way too much nostalgia.

## What it does

Point it at your eXoDOS (or eXoWin9x, etc.) folder and it scans the LaunchBox XML metadata into a local SQLite database. Then you get a fast, searchable, filterable game browser with edit.com vibes.

- Fast full-text search
- Simple filtering / browsing
- Color themes
- Optional CRT effect
- Favorites
- Keyboard navigation

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
| `Up/Down` | Navigate list |
| `Left/Right` | Navigate between sections |
| `PgUp/PgDn` | Page through list |
| `Home/End` | Jump to first/last |
| `/` | Focus search bar |
| `Enter` (in search) | Execute search |
| `Esc` | Clear search + filters |
| `F` | Toggle favorite |
| `Alt+F/O/T/H` | Open menus |
