use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::State;

use crate::state::AppState;

#[tauri::command]
pub fn launch_game(state: State<AppState>, id: i64) -> Result<String, String> {
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

    let full_path = PathBuf::from(&collection_path).join(&app_path);

    if !full_path.exists() {
        return Err(format!("Game executable not found: {}", full_path.display()));
    }

    let work_dir = if let Some(ref rf) = root_folder {
        PathBuf::from(&collection_path).join(rf)
    } else {
        full_path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from(&collection_path))
    };

    // Kill any previously tracked game process tree before launching a new one
    kill_current_game(&state);

    let child = Command::new("cmd")
        .args(["/C", &full_path.to_string_lossy()])
        .current_dir(&work_dir)
        // Null stdin so CHOICE.EXE and similar tools don't block/beep waiting for input
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to launch game: {}", e))?;

    *state.current_game.lock().map_err(|e| e.to_string())? = Some(child);

    Ok(format!("Launched: {}", full_path.display()))
}

#[tauri::command]
pub fn kill_game(state: State<AppState>) -> Result<(), String> {
    kill_current_game(&state);
    Ok(())
}

/// Kill the tracked child process and its entire process tree using taskkill.
pub fn kill_current_game(state: &AppState) {
    let mut guard = match state.current_game.lock() {
        Ok(g) => g,
        Err(_) => return,
    };

    if let Some(child) = guard.take() {
        let pid = child.id();
        // taskkill /F /T kills the process and all its children (DOSBox, CHOICE.EXE, etc.)
        let _ = Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();
    }
}
