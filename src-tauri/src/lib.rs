mod commands;
mod db;
mod models;
mod state;
mod xml;

use models::AppConfig;
use rusqlite::Connection;
use state::AppState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = initialize_state().expect("Failed to initialize app state");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::games::search_games,
            commands::games::get_game,
            commands::games::get_filter_options,
            commands::games::get_game_images,
            commands::games::get_game_videos,
            commands::games::get_game_extras,
            commands::games::toggle_favorite,
            commands::games::clear_all_favorites,
            commands::collections::scan_collection,
            commands::collections::list_collections,
            commands::collections::validate_collection_path,
            commands::collections::delete_collection,
            commands::collections::rescan_all_collections,
            commands::launch::launch_game,
            commands::launch::kill_game,
            commands::launch::send_game_input,
            commands::config::get_config,
            commands::config::set_config,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let app_state = window.state::<AppState>();
                commands::launch::kill_current_game(&app_state);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn initialize_state() -> Result<AppState, String> {
    // Use app data directory for the database
    let db_dir = dirs_next().map_err(|e| format!("Failed to get app data dir: {}", e))?;
    std::fs::create_dir_all(&db_dir).map_err(|e| e.to_string())?;

    let db_path = db_dir.join("exo_terminal.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Enable WAL mode for better concurrent access
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| e.to_string())?;

    db::schema::initialize(&conn).map_err(|e| e.to_string())?;

    let config = AppConfig::default();

    Ok(AppState {
        db: Mutex::new(conn),
        config: Mutex::new(config),
        game_pid: Mutex::new(None),
    })
}

pub(crate) fn dirs_next() -> Result<std::path::PathBuf, String> {
    // Store in %APPDATA%/exo-terminal/
    if let Some(app_data) = std::env::var_os("APPDATA") {
        let dir = std::path::PathBuf::from(app_data).join("exo-terminal");
        return Ok(dir);
    }
    // Fallback
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Could not determine home directory".to_string())?;
    Ok(std::path::PathBuf::from(home).join(".exo-terminal"))
}
