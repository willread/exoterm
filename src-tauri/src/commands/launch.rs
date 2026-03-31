use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use tauri::{AppHandle, Emitter, State};

use crate::state::AppState;

#[tauri::command]
pub fn launch_game(
    app: AppHandle,
    state: State<AppState>,
    id: i64,
) -> Result<String, String> {
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

    // Kill any existing game before launching
    kill_current_game(&state);

    // Launch the batch file in a new CMD window so the user can interact
    // with any CHOICE prompts, config menus, etc. naturally.
    let mut child = Command::new("cmd")
        .args(["/C", "start", "cmd", "/C", &full_path.to_string_lossy()])
        .current_dir(&work_dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to launch game: {}", e))?;

    let pid = child.id();
    *state.game_pid.lock().map_err(|e| e.to_string())? = Some(pid);

    // Wait for the launcher cmd to finish in background, then emit game-exited
    {
        let app_handle = app.clone();
        thread::spawn(move || {
            let _ = child.wait();
            app_handle.emit("game-exited", ()).ok();
        });
    }

    app.emit("game-started", ()).ok();
    Ok(format!("Launched: {}", full_path.display()))
}

#[tauri::command]
pub fn send_game_input(_input: String) -> Result<(), String> {
    // No-op — CHOICE prompts are handled natively in the CMD window now
    Ok(())
}

#[tauri::command]
pub fn kill_game(state: State<AppState>) -> Result<(), String> {
    kill_current_game(&state);
    Ok(())
}

/// Kill the tracked game process tree using taskkill.
pub fn kill_current_game(state: &AppState) {
    if let Ok(mut guard) = state.game_pid.lock() {
        if let Some(pid) = guard.take() {
            let _ = Command::new("taskkill")
                .args(["/F", "/T", "/PID", &pid.to_string()])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn();
        }
    }
}
