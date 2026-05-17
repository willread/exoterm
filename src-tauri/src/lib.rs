mod commands;
mod db;
mod models;
mod paths;
mod state;
mod watcher;
mod xml;

use models::AppConfig;
use rusqlite::Connection;
use state::AppState;
use std::path::PathBuf;
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
            commands::collections::suggest_path_mode,
            commands::collections::delete_collection,
            commands::collections::rescan_all_collections,
            commands::launch::launch_game,
            commands::launch::kill_game,
            commands::launch::send_game_input,
            commands::launch::open_path_with_shell,
            commands::config::get_config,
            commands::config::set_config,
        ])
        .setup(|app| {
            // Start background filesystem watcher for installed-game detection
            watcher::start_watcher(app.handle().clone());
            Ok(())
        })
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
    let db_path = resolve_db_path(std::env::args().collect())?;
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    eprintln!("[exoterm] db: {}", db_path.display());

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

pub(crate) fn dirs_next() -> Result<PathBuf, String> {
    // Store in %APPDATA%/exo-terminal/
    if let Some(app_data) = std::env::var_os("APPDATA") {
        let dir = PathBuf::from(app_data).join("exo-terminal");
        return Ok(dir);
    }
    // Fallback
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Could not determine home directory".to_string())?;
    Ok(PathBuf::from(home).join(".exo-terminal"))
}

/// Pick the SQLite file path: `--db <path>` / `--db=<path>` wins, otherwise default
/// to `<app-data-dir>/exo_terminal.db`.
pub(crate) fn resolve_db_path(args: Vec<String>) -> Result<PathBuf, String> {
    if let Some(custom) = parse_db_arg(&args) {
        return Ok(custom);
    }
    let dir = dirs_next().map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(dir.join("exo_terminal.db"))
}

/// Extract the `--db` argument value, if any. Supports `--db <path>` and `--db=<path>`.
/// Returns `None` if the flag is absent or the value is missing.
fn parse_db_arg(args: &[String]) -> Option<PathBuf> {
    let mut iter = args.iter().skip(1);
    while let Some(a) = iter.next() {
        if a == "--db" {
            return iter.next().filter(|v| !v.is_empty()).map(PathBuf::from);
        }
        if let Some(v) = a.strip_prefix("--db=") {
            if !v.is_empty() {
                return Some(PathBuf::from(v));
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn argv(items: &[&str]) -> Vec<String> {
        items.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn parses_db_flag_space_form() {
        let args = argv(&["exoterm.exe", "--db", "D:\\portable\\exo.db"]);
        assert_eq!(
            parse_db_arg(&args),
            Some(PathBuf::from("D:\\portable\\exo.db"))
        );
    }

    #[test]
    fn parses_db_flag_equals_form() {
        let args = argv(&["exoterm.exe", "--db=D:\\portable\\exo.db"]);
        assert_eq!(
            parse_db_arg(&args),
            Some(PathBuf::from("D:\\portable\\exo.db"))
        );
    }

    #[test]
    fn returns_none_when_flag_absent() {
        assert_eq!(parse_db_arg(&argv(&["exoterm.exe"])), None);
        assert_eq!(parse_db_arg(&argv(&["exoterm.exe", "--other"])), None);
    }

    #[test]
    fn ignores_dangling_flag_with_no_value() {
        assert_eq!(parse_db_arg(&argv(&["exoterm.exe", "--db"])), None);
    }

    #[test]
    fn ignores_empty_value() {
        assert_eq!(parse_db_arg(&argv(&["exoterm.exe", "--db", ""])), None);
        assert_eq!(parse_db_arg(&argv(&["exoterm.exe", "--db="])), None);
    }

    #[test]
    fn resolve_falls_back_to_default_without_flag() {
        // Without the flag we should land in the default app-data dir.
        // We can't assert the absolute path (varies by host), but we can assert
        // the filename is the one we expect.
        let resolved = resolve_db_path(argv(&["exoterm.exe"])).unwrap();
        assert_eq!(resolved.file_name().unwrap(), "exo_terminal.db");
    }

    #[test]
    fn resolve_honors_db_flag() {
        let resolved =
            resolve_db_path(argv(&["exoterm.exe", "--db", "X:\\custom.db"])).unwrap();
        assert_eq!(resolved, PathBuf::from("X:\\custom.db"));
    }
}
