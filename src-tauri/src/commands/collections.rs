use std::path::Path;
use tauri::State;

use crate::models::CollectionInfo;
use crate::state::AppState;
use crate::xml::parser;

#[tauri::command]
pub fn scan_collection(
    state: State<AppState>,
    name: String,
    path: String,
) -> Result<usize, String> {
    // Validate path
    let platforms_dir = Path::new(&path).join("Data").join("Platforms");
    if !platforms_dir.exists() {
        return Err(format!(
            "Invalid eXo collection: Data/Platforms/ not found in {}",
            path
        ));
    }

    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Upsert collection
    db.execute(
        "INSERT INTO collections (name, path, last_scanned) VALUES (?1, ?2, strftime('%s', 'now'))
         ON CONFLICT(path) DO UPDATE SET name = ?1, last_scanned = strftime('%s', 'now')",
        rusqlite::params![name, path],
    )
    .map_err(|e| e.to_string())?;

    let collection_id: i64 = db
        .query_row(
            "SELECT id FROM collections WHERE path = ?",
            [&path],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Scan XML files — initial import: use LaunchBox favorites as-is
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
            "SELECT c.id, c.name, c.path, COUNT(g.id) as game_count
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
                game_count: row.get(3)?,
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

    // Gather all existing collections
    let mut stmt = db
        .prepare("SELECT id, name, path FROM collections")
        .map_err(|e| e.to_string())?;
    let cols: Vec<(i64, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    let mut total = 0;
    for (collection_id, name, path) in &cols {
        // Update last_scanned timestamp
        db.execute(
            "UPDATE collections SET last_scanned = strftime('%s', 'now') WHERE id = ?",
            [collection_id],
        )
        .map_err(|e| e.to_string())?;

        // Rescan: preserve user-set favorites (ignore LaunchBox favorites column)
        let count = parser::scan_collection(&db, *collection_id, path, true, &mut |count, file| {
            eprintln!("Re-scanning {} ({}): {} games so far...", name, file, count);
        })?;
        total += count;
    }

    Ok(total)
}

#[tauri::command]
pub fn validate_collection_path(path: String) -> Result<bool, String> {
    let platforms_dir = Path::new(&path).join("Data").join("Platforms");
    Ok(platforms_dir.exists())
}
