use notify::{EventKind, RecursiveMode, Watcher};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

use crate::state::AppState;
use crate::xml::parser::is_game_installed;

/// Spawn a background thread that watches collection directories for installed-game changes.
/// When a game directory is created or removed, we re-check installed status and emit an
/// `installed-status-changed` event to the frontend.
pub fn start_watcher(app_handle: AppHandle) {
    std::thread::spawn(move || {
        if let Err(e) = run_watcher(app_handle) {
            eprintln!("[watcher] fatal: {}", e);
        }
    });
}

/// Discover all directories that should be watched for each collection.
///
/// eXo collections store extracted games in subdirectories alongside the stub "!" dir.
/// For eXoDOS:  watch `{collection}/eXo/eXoDOS/` (game dirs appear here)
/// For eXoWin9x: watch `{collection}/eXo/eXoWin9x/1994/`, `.../1995/`, `.../1996/`
///               (game dirs appear inside year subdirectories)
///
/// We find the right dirs by scanning for the "!" stub dir and then watching its siblings
/// (and for year-based layouts, the subdirectories of those siblings).
fn get_collection_watch_dirs(app_handle: &AppHandle) -> Vec<PathBuf> {
    let state = app_handle.state::<AppState>();
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return vec![],
    };
    let mut stmt = match db.prepare("SELECT path FROM collections") {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    let collection_paths: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .ok()
        .map(|rows| rows.flatten().collect())
        .unwrap_or_default();

    let mut watch_dirs = Vec::new();

    for cpath in &collection_paths {
        // Walk into {collection}/eXo/ and find each sub-collection (eXoDOS, eXoWin9x, etc.)
        let exo_dir = PathBuf::from(cpath).join("eXo");
        let sub_collections = match std::fs::read_dir(&exo_dir) {
            Ok(rd) => rd.flatten().filter(|e| e.path().is_dir()).collect::<Vec<_>>(),
            Err(_) => continue,
        };

        for sub in &sub_collections {
            let sub_path = sub.path();
            let sub_name = sub.file_name().to_string_lossy().to_string();

            // Skip non-collection dirs (like "emulators", "util")
            if !sub_name.starts_with("eXo") {
                continue;
            }

            // Check if this sub-collection uses a year-based layout (like eXoWin9x)
            // by looking for a "!" stub dir and checking if it has year subdirs
            let has_year_layout = std::fs::read_dir(&sub_path)
                .ok()
                .and_then(|rd| {
                    rd.flatten().find(|e| {
                        e.file_name().to_string_lossy().starts_with('!')
                            && e.path().is_dir()
                    })
                })
                .map(|bang_entry| {
                    // If the bang dir contains year-named subdirs, it's a year layout
                    std::fs::read_dir(bang_entry.path())
                        .ok()
                        .map(|rd| {
                            rd.flatten().any(|e| {
                                e.path().is_dir()
                                    && e.file_name()
                                        .to_string_lossy()
                                        .chars()
                                        .all(|c| c.is_ascii_digit())
                            })
                        })
                        .unwrap_or(false)
                })
                .unwrap_or(false);

            if has_year_layout {
                // Year-based: watch each year subdir (e.g. eXo/eXoWin9x/1995/)
                // These are the sibling year dirs (not inside the ! dir)
                if let Ok(rd) = std::fs::read_dir(&sub_path) {
                    for entry in rd.flatten() {
                        let p = entry.path();
                        let name = entry.file_name().to_string_lossy().to_string();
                        if p.is_dir()
                            && !name.starts_with('!')
                            && name.chars().all(|c| c.is_ascii_digit())
                        {
                            watch_dirs.push(p);
                        }
                    }
                }
            } else {
                // Flat layout (eXoDOS): watch the sub-collection dir itself
                watch_dirs.push(sub_path);
            }
        }
    }

    watch_dirs
}

/// Lightweight re-check of installed status for every game across all collections.
/// Returns `true` if any game's installed status changed (and was updated in the DB).
fn refresh_installed(app_handle: &AppHandle) -> bool {
    let state = app_handle.state::<AppState>();
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return false,
    };

    let cols: Vec<(i64, String)> = {
        let mut stmt = match db.prepare("SELECT id, path FROM collections") {
            Ok(s) => s,
            Err(_) => return false,
        };
        stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .ok()
            .map(|r| r.flatten().collect())
            .unwrap_or_default()
    };

    let mut changed = false;

    for (cid, cpath) in &cols {
        let root = Path::new(cpath);
        let rows: Vec<(i64, String, bool)> = {
            let mut stmt = match db.prepare(
                "SELECT id, application_path, installed FROM games WHERE collection_id = ?",
            ) {
                Ok(s) => s,
                Err(_) => continue,
            };
            stmt.query_map([cid], |row| {
                Ok((
                    row.get(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i32>(2)? != 0,
                ))
            })
            .ok()
            .map(|r| r.flatten().collect())
            .unwrap_or_default()
        };

        for (id, app_path, was_installed) in &rows {
            let is_installed = is_game_installed(root, app_path);

            if is_installed != *was_installed {
                changed = true;
                let _ = db.execute(
                    "UPDATE games SET installed = ? WHERE id = ?",
                    rusqlite::params![is_installed as i32, id],
                );
            }
        }
    }

    changed
}

/// Main watcher loop — watches filesystem and emits events on installed-status changes.
fn run_watcher(app_handle: AppHandle) -> Result<(), String> {
    let (tx, rx) = mpsc::channel();

    let sender = tx.clone();
    let mut watcher =
        notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                if matches!(
                    event.kind,
                    EventKind::Create(_) | EventKind::Remove(_)
                ) {
                    let _ = sender.send(());
                }
            }
        })
        .map_err(|e| format!("Failed to create file watcher: {}", e))?;

    let mut watched: HashSet<PathBuf> = HashSet::new();

    // Set up initial watches
    for dir in get_collection_watch_dirs(&app_handle) {
        if watcher.watch(&dir, RecursiveMode::NonRecursive).is_ok() {
            eprintln!("[watcher] watching {}", dir.display());
            watched.insert(dir);
        }
    }

    let debounce = Duration::from_secs(3);
    let recheck_interval = Duration::from_secs(30);

    loop {
        match rx.recv_timeout(recheck_interval) {
            Ok(()) => {
                // Debounce: drain further events for the debounce duration.
                // Game extraction can produce many filesystem events in quick succession.
                let deadline = Instant::now() + debounce;
                while Instant::now() < deadline {
                    let remaining = deadline.saturating_duration_since(Instant::now());
                    if remaining.is_zero() {
                        break;
                    }
                    let _ = rx.recv_timeout(remaining);
                }

                // Re-check installed status and notify frontend if anything changed
                if refresh_installed(&app_handle) {
                    eprintln!("[watcher] installed status changed, notifying frontend");
                    let _ = app_handle.emit("installed-status-changed", ());
                }
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                // Periodically check for new collections that need watching
                for dir in get_collection_watch_dirs(&app_handle) {
                    if !watched.contains(&dir) {
                        if watcher.watch(&dir, RecursiveMode::NonRecursive).is_ok() {
                            eprintln!("[watcher] now watching {}", dir.display());
                            watched.insert(dir);
                        }
                    }
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                eprintln!("[watcher] channel disconnected, stopping");
                break;
            }
        }
    }

    Ok(())
}
