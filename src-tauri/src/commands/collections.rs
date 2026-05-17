use std::path::Path;
use tauri::State;

use crate::models::CollectionInfo;
use crate::paths::{self, MODE_ABSOLUTE, MODE_PORTABLE_DRIVE};
use crate::state::AppState;
use crate::xml::parser;

#[tauri::command(rename_all = "snake_case")]
pub fn scan_collection(
    state: State<AppState>,
    name: String,
    path: String,
    portable: bool,
) -> Result<usize, String> {
    // Validate path on disk (always uses the absolute path the user picked).
    let platforms_dir = Path::new(&path).join("Data").join("Platforms");
    if !platforms_dir.exists() {
        return Err(format!(
            "Invalid eXo collection: Data/Platforms/ not found in {}",
            path
        ));
    }

    // Decide what to store. Portable mode strips the drive letter so the entry
    // survives the drive remounting under a different letter.
    let (stored_path, path_mode) = if portable {
        if !paths::is_on_exe_drive(Path::new(&path)) {
            return Err(
                "Portable collections must live on the same drive as eXo Terminal.".to_string(),
            );
        }
        (
            paths::to_portable_form(Path::new(&path)),
            MODE_PORTABLE_DRIVE,
        )
    } else {
        (path.clone(), MODE_ABSOLUTE)
    };

    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Upsert collection
    db.execute(
        "INSERT INTO collections (name, path, path_mode, last_scanned)
         VALUES (?1, ?2, ?3, strftime('%s', 'now'))
         ON CONFLICT(path) DO UPDATE SET name = ?1, path_mode = ?3, last_scanned = strftime('%s', 'now')",
        rusqlite::params![name, stored_path, path_mode],
    )
    .map_err(|e| e.to_string())?;

    let collection_id: i64 = db
        .query_row(
            "SELECT id FROM collections WHERE path = ?",
            [&stored_path],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Scan XML files using the resolved absolute path
    let count = parser::scan_collection(&db, collection_id, &path, false, &mut |count, file| {
        eprintln!("Scanning {}: {} games so far...", file, count);
    })?;

    Ok(count)
}

#[tauri::command]
pub fn list_collections(state: State<AppState>) -> Result<Vec<CollectionInfo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT c.id, c.name, c.path, c.path_mode, COUNT(g.id) as game_count
             FROM collections c
             LEFT JOIN games g ON g.collection_id = c.id
             GROUP BY c.id",
        )
        .map_err(|e| e.to_string())?;

    let collections = stmt
        .query_map([], |row| {
            Ok(CollectionInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                path_mode: row.get(3)?,
                game_count: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    Ok(collections)
}

#[tauri::command]
pub fn delete_collection(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Delete all games belonging to this collection (FTS trigger handles cleanup)
    db.execute("DELETE FROM games WHERE collection_id = ?", [id])
        .map_err(|e| e.to_string())?;

    // Delete the collection itself
    db.execute("DELETE FROM collections WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;

    // Rebuild FTS index
    let _ = db.execute("INSERT INTO games_fts(games_fts) VALUES('rebuild')", []);

    Ok(())
}

#[tauri::command]
pub fn rescan_all_collections(state: State<AppState>) -> Result<usize, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Gather all existing collections (raw stored path + mode)
    let mut stmt = db
        .prepare("SELECT id, name, path, path_mode FROM collections")
        .map_err(|e| e.to_string())?;
    let cols: Vec<(i64, String, String, String)> = stmt
        .query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    let mut total = 0;
    for (collection_id, name, stored_path, path_mode) in &cols {
        // Update last_scanned timestamp
        db.execute(
            "UPDATE collections SET last_scanned = strftime('%s', 'now') WHERE id = ?",
            [collection_id],
        )
        .map_err(|e| e.to_string())?;

        let resolved = paths::resolve_collection_path(stored_path, path_mode)?;
        let resolved_str = resolved.to_string_lossy().into_owned();

        // Rescan: preserve user-set favorites (ignore LaunchBox favorites column)
        let count = parser::scan_collection(
            &db,
            *collection_id,
            &resolved_str,
            true,
            &mut |count, file| {
                eprintln!("Re-scanning {} ({}): {} games so far...", name, file, count);
            },
        )?;
        total += count;
    }

    Ok(total)
}

#[tauri::command]
pub fn validate_collection_path(path: String) -> Result<bool, String> {
    let platforms_dir = Path::new(&path).join("Data").join("Platforms");
    Ok(platforms_dir.exists())
}

/// Tell the frontend how a chosen path *would* be stored if portable mode is on,
/// and whether portable is even available (the path must be on the exe's drive).
#[derive(serde::Serialize)]
pub struct PortableSuggestion {
    /// True iff the path is on the same drive as the running exe.
    pub portable_available: bool,
    /// Pre-rendered preview of what would land in `collections.path`, e.g. `\eXoDOS`.
    /// Empty when `portable_available == false`.
    pub portable_stored_path: String,
}

#[tauri::command]
pub fn suggest_path_mode(path: String) -> Result<PortableSuggestion, String> {
    let p = Path::new(&path);
    if paths::is_on_exe_drive(p) {
        Ok(PortableSuggestion {
            portable_available: true,
            portable_stored_path: paths::to_portable_form(p),
        })
    } else {
        Ok(PortableSuggestion {
            portable_available: false,
            portable_stored_path: String::new(),
        })
    }
}
