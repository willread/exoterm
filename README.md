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
- Installed game detection
- Random game picker

## Build

Needs [Rust](https://rustup.rs/) and [Node.js](https://nodejs.org/).

```
npm install
npm run dev     # dev mode with hot reload
npm run package # standalone .exe + installer
```

## Portable use

You can run exoterm from a USB / external drive alongside your eXo collections — drive-letter changes survive a reboot or moving the drive between ports.

Two pieces work together:

**1. Per-collection portable paths.** In the "Add Collection" dialog there's a checkbox: *"Portable (collection is on the same drive as eXo Terminal)"*. It's auto-checked when the folder you pick is on the same drive as `exoterm.exe`. When on, the path is stored without a drive letter (e.g. `\eXoDOS`) and the current exe's drive is prepended at launch time.

**2. `--db` flag for the database location.** By default the SQLite database lives in `%APPDATA%\exo-terminal\`. Pass `--db <path>` to point it at a file on the drive instead, so your collections list, favorites, and installed-status all travel with the drive.

Typical setup: drop `exoterm.exe` at the root of the drive, then add a one-line `exoterm.cmd` next to it:

```
@start "" "%~dp0exoterm.exe" --db "%~dp0exoterm-data\exo.db"
```

Launch via the `.cmd` and everything — binary, collections, database — lives on the drive.
