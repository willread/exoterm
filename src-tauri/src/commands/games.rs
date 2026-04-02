use std::path::PathBuf;
use tauri::State;

use crate::db::queries;
use crate::models::{FilterOptions, Game, GameExtra, GameImage, GameVideo, SearchResult};
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
    has_extras: Option<bool>,
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
        has_extras.unwrap_or(false),
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
    genre: Option<String>,
    developer: Option<String>,
    publisher: Option<String>,
    year: Option<i32>,
    series: Option<String>,
    platform: Option<String>,
    favorites_only: Option<bool>,
) -> Result<FilterOptions, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    queries::get_filter_options(
        &db,
        &content_type.unwrap_or_default(),
        &genre.unwrap_or_default(),
        &developer.unwrap_or_default(),
        &publisher.unwrap_or_default(),
        year,
        &series.unwrap_or_default(),
        &platform.unwrap_or_default(),
        favorites_only.unwrap_or(false),
    )
    .map_err(|e| e.to_string())
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
pub fn get_game_extras(state: State<AppState>, id: i64) -> Result<Vec<GameExtra>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let collection_path: String = db
        .query_row(
            "SELECT c.path FROM games g
             JOIN collections c ON g.collection_id = c.id
             WHERE g.id = ?",
            [id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare(
            "SELECT id, name, path, region, kind
             FROM game_extras
             WHERE game_id = ?
             ORDER BY kind, name",
        )
        .map_err(|e| e.to_string())?;

    let collection_root = PathBuf::from(&collection_path);

    let extras: Vec<GameExtra> = stmt
        .query_map([id], |row| {
            Ok(GameExtra {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                region: row.get(3)?,
                kind: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .map(|e| {
            // Resolve relative path (Windows backslashes) to absolute
            let rel = e.path.replace('\\', std::path::MAIN_SEPARATOR_STR);
            let abs = collection_root.join(&rel);
            GameExtra {
                path: abs.to_string_lossy().to_string(),
                ..e
            }
        })
        .collect();

    Ok(extras)
}

const VIDEO_EXTENSIONS: &[&str] = &["mp4", "avi", "mkv", "mov", "wmv", "webm", "m4v", "ogv", "flv"];

/// Split a batch file line into tokens, respecting double-quoted strings.
fn bat_line_tokens(line: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    for ch in line.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            ' ' | '\t' if !in_quotes => {
                if !current.is_empty() {
                    tokens.push(current.clone());
                    current.clear();
                }
            }
            _ => current.push(ch),
        }
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
}

fn has_video_extension(s: &str) -> bool {
    let lower = s.to_lowercase();
    VIDEO_EXTENSIONS.iter().any(|ext| lower.ends_with(&format!(".{}", ext)))
}

/// Parse a batch file and return absolute paths to any video files it references.
/// `bat_path` is the full path to the .bat file; `work_dir` is the working directory
/// the batch runs from; `collection_root` is a fallback search root.
fn extract_bat_video_paths(
    bat_path: &PathBuf,
    work_dir: &PathBuf,
    collection_root: &PathBuf,
) -> Vec<PathBuf> {
    let content = match std::fs::read_to_string(bat_path) {
        Ok(c) => c,
        Err(_) => return vec![],
    };

    let bat_dir = bat_path.parent().unwrap_or(work_dir.as_path());
    let mut found: Vec<PathBuf> = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();
        // Skip comments and echo lines
        let lower = trimmed.to_lowercase();
        if lower.starts_with("rem ") || lower.starts_with("::") || lower.starts_with("echo ") {
            continue;
        }

        for token in bat_line_tokens(trimmed) {
            if !has_video_extension(&token) {
                continue;
            }
            // Try the token as-is (absolute), then relative to bat dir, work dir, collection root
            let candidates = [
                PathBuf::from(&token),
                bat_dir.join(&token),
                work_dir.join(&token),
                collection_root.join(&token),
            ];
            for candidate in &candidates {
                if candidate.is_absolute() || candidate.components().count() > 1 {
                    if let Ok(canonical) = candidate.canonicalize() {
                        if !found.contains(&canonical) {
                            found.push(canonical);
                            break;
                        }
                    } else if candidate.exists() {
                        let p = candidate.clone();
                        if !found.contains(&p) {
                            found.push(p);
                            break;
                        }
                    }
                }
            }
        }
    }

    found
}

#[tauri::command]
pub fn get_game_videos(state: State<AppState>, id: i64) -> Result<Vec<GameVideo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let (app_path, root_folder, collection_path): (String, Option<String>, String) = db
        .query_row(
            "SELECT g.application_path, g.root_folder, c.path
             FROM games g
             JOIN collections c ON g.collection_id = c.id
             WHERE g.id = ?",
            [id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
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

    let collection_root = PathBuf::from(&collection_path);
    let bat_path = collection_root.join(&app_path);
    let work_dir = if let Some(ref rf) = root_folder {
        collection_root.join(rf)
    } else {
        bat_path.parent().map(|p| p.to_path_buf()).unwrap_or_else(|| collection_root.clone())
    };

    // Collect seen paths to deduplicate across sources
    let mut seen_paths: Vec<PathBuf> = Vec::new();
    let mut results: Vec<GameVideo> = Vec::new();

    // 1. Parse the .bat file for video references — these are the "intended" videos
    //    (e.g. a Video content-type entry whose bat just calls `start intro.mp4`)
    if bat_path.exists() {
        for abs_path in extract_bat_video_paths(&bat_path, &work_dir, &collection_root) {
            if seen_paths.contains(&abs_path) {
                continue;
            }
            let name = abs_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            seen_paths.push(abs_path.clone());
            results.push(GameVideo {
                name,
                path: abs_path.to_string_lossy().to_string(),
                source: "bat".to_string(),
            });
        }
    }

    // 2. Scan Videos/{game_folder}/ then Extras/{game_folder}/ (LaunchBox standard locations)
    for subdir in &["Videos", "Extras"] {
        let dir = collection_root.join(subdir).join(&game_folder);
        if !dir.is_dir() {
            continue;
        }
        let mut entries: Vec<_> = std::fs::read_dir(&dir)
            .map(|rd| rd.flatten().collect())
            .unwrap_or_default();
        entries.sort_by_key(|e| e.file_name());
        for entry in entries {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                let ext_lower = ext.to_string_lossy().to_lowercase();
                if VIDEO_EXTENSIONS.contains(&ext_lower.as_str()) {
                    let canonical = path.canonicalize().unwrap_or_else(|_| path.clone());
                    if seen_paths.contains(&canonical) {
                        continue;
                    }
                    let name = path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();
                    seen_paths.push(canonical);
                    results.push(GameVideo {
                        name,
                        path: path.to_string_lossy().to_string(),
                        source: "dir".to_string(),
                    });
                }
            }
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

#[tauri::command]
pub fn clear_all_favorites(state: State<AppState>) -> Result<u64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let count = db
        .execute("UPDATE games SET favorite = 0 WHERE favorite = 1", [])
        .map_err(|e| e.to_string())?;
    Ok(count as u64)
}
