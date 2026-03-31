use tauri::State;

use crate::db::queries;
use crate::models::{FilterOptions, Game, SearchResult};
use crate::state::AppState;

#[tauri::command]
pub fn search_games(
    state: State<AppState>,
    query: Option<String>,
    content_type: Option<String>,
    genre: Option<String>,
    developer: Option<String>,
    publisher: Option<String>,
    year: Option<i32>,
    series: Option<String>,
    platform: Option<String>,
    favorites_only: Option<bool>,
    sort_by: Option<String>,
    sort_dir: Option<String>,
    offset: Option<i64>,
    limit: Option<i64>,
) -> Result<SearchResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    queries::search_games(
        &db,
        &query.unwrap_or_default(),
        &content_type.unwrap_or_default(),
        genre.as_deref(),
        developer.as_deref(),
        publisher.as_deref(),
        year,
        series.as_deref(),
        platform.as_deref(),
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

#[tauri::command]
pub fn get_filter_options(
    state: State<AppState>,
    content_type: Option<String>,
) -> Result<FilterOptions, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_filter_options(&db, &content_type.unwrap_or_default()).map_err(|e| e.to_string())
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
