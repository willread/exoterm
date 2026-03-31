use std::path::PathBuf;
use tauri::State;

use crate::db::queries;
use crate::models::{FilterOptions, Game, GameImage, SearchResult};
use crate::state::AppState;

#[tauri::command(rename_all = "snake_case")]
pub fn search_games(
    state: State<AppState>,
    query: Option<String>,
    content_type: Option<String>,
    genre: Option<Vec<String>>,
    developer: Option<Vec<String>>,
    publisher: Option<Vec<String>>,
    year: Option<Vec<i32>>,
    series: Option<Vec<String>>,
    platform: Option<Vec<String>>,
    favorites_only: Option<bool>,
    sort_by: Option<String>,
    sort_dir: Option<String>,
    offset: Option<i64>,
    limit: Option<i64>,
) -> Result<SearchResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let genres = genre.unwrap_or_default();
    let developers = developer.unwrap_or_default();
    let publishers = publisher.unwrap_or_default();
    let years = year.unwrap_or_default();
    let series_list = series.unwrap_or_default();
    let platforms = platform.unwrap_or_default();
    queries::search_games(
        &db,
        &query.unwrap_or_default(),
        &content_type.unwrap_or_default(),
        &genres,
        &developers,
        &publishers,
        &years,
        &series_list,
        &platforms,
        favorites_only.unwrap_or(false),
        &sort_by.unwrap_or_else(|| "title".to_string()),
        &sort_dir.unwrap_or_else(|| "asc".to_string()),
        offset.unwrap_or(0),
        limit.unwrap_or(100),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_game(state: State<AppState>, id: i64) -> Result<Game, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_game(&db, id).map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_filter_options(
    state: State<AppState>,
    content_type: Option<String>,
) -> Result<FilterOptions, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_filter_options(&db, &content_type.unwrap_or_default()).map_err(|e| e.to_string())
}

/// Image category priority: box art first, then screenshots
const IMAGE_CATEGORIES: &[&str] = &[
    "Box - Front",
    "Box - Front - Reconstructed",
    "Fanart - Box - Front",
    "Screenshot - Game Title",
    "Screenshot - Gameplay",
];

#[tauri::command]
pub fn get_game_images(state: State<AppState>, id: i64) -> Result<Vec<GameImage>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let (app_path, collection_path): (String, String) = db
        .query_row(
            "SELECT g.application_path, c.path
             FROM games g
             JOIN collections c ON g.collection_id = c.id
             WHERE g.id = ?",
            [id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;
    drop(db);

    // Derive game folder from application_path: "eXo\!dos\GameName\GameName.bat" -> "GameName"
    let path_buf = PathBuf::from(&app_path);
    let segments: Vec<_> = path_buf.components().collect();
    let game_folder = if segments.len() >= 3 {
        segments[segments.len() - 2]
            .as_os_str()
            .to_string_lossy()
            .to_string()
    } else {
        return Ok(vec![]);
    };

    let images_base = PathBuf::from(&collection_path).join("Images").join(&game_folder);
    if !images_base.exists() {
        return Ok(vec![]);
    }

    let mut results = Vec::new();

    for category in IMAGE_CATEGORIES {
        let cat_dir = images_base.join(category);
        if !cat_dir.is_dir() {
            continue;
        }
        // Take the first image file found
        if let Ok(entries) = std::fs::read_dir(&cat_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(ext) = path.extension() {
                    let ext = ext.to_string_lossy().to_lowercase();
                    if matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "gif" | "webp") {
                        if let Ok(data) = std::fs::read(&path) {
                            use base64::Engine;
                            let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
                            let mime = match ext.as_str() {
                                "jpg" | "jpeg" => "image/jpeg",
                                "gif" => "image/gif",
                                "webp" => "image/webp",
                                _ => "image/png",
                            };
                            results.push(GameImage {
                                category: category.to_string(),
                                data_url: format!("data:{};base64,{}", mime, b64),
                            });
                            break; // one image per category
                        }
                    }
                }
            }
        }
        if results.len() >= 2 {
            break; // box art + one screenshot is enough
        }
    }

    Ok(results)
}

#[tauri::command]
pub fn toggle_favorite(state: State<AppState>, id: i64) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE games SET favorite = CASE WHEN favorite = 0 THEN 1 ELSE 0 END WHERE id = ?",
        [id],
    )
    .map_err(|e| e.to_string())?;

    let fav: bool = db
        .query_row("SELECT favorite FROM games WHERE id = ?", [id], |row| {
            Ok(row.get::<_, i32>(0)? != 0)
        })
        .map_err(|e| e.to_string())?;

    Ok(fav)
}
