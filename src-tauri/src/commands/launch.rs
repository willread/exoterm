use std::io::{Read, Write};
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

    let mut child = Command::new("cmd")
        .args(["/C", &full_path.to_string_lossy()])
        .current_dir(&work_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to launch game: {}", e))?;

    let pid = child.id();
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    let stdin = child.stdin.take().unwrap();

    // Store pid and stdin
    *state.game_pid.lock().map_err(|e| e.to_string())? = Some(pid);
    *state.game_stdin.lock().map_err(|e| e.to_string())? = Some(stdin);

    // We don't store the Child itself — process runs independently.
    // Spawn it so it doesn't become a zombie (detach).
    thread::spawn(move || {
        let _ = child.wait();
    });

    // Spawn stdout reader thread — emits chunks and detects CHOICE prompts
    {
        let app_handle = app.clone();
        thread::spawn(move || {
            read_output_stream(stdout, app_handle);
        });
    }

    // Merge stderr into the same stream
    {
        let app_handle = app.clone();
        thread::spawn(move || {
            read_output_stream(stderr, app_handle);
        });
    }

    app.emit("game-started", ()).ok();
    Ok(format!("Launched: {}", full_path.display()))
}

/// Read from a process output stream, emit chunks as `game-output` events,
/// and detect CHOICE.EXE prompts to emit `game-choice` events.
fn read_output_stream<R: Read + Send + 'static>(stream: R, app: AppHandle) {
    let mut buf = [0u8; 256];
    let mut accumulated = String::new();
    let mut reader = stream;

    loop {
        match reader.read(&mut buf) {
            Ok(0) => break, // EOF
            Ok(n) => {
                let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                accumulated.push_str(&chunk);

                // Emit raw output for display
                app.emit("game-output", chunk).ok();

                // Check for CHOICE prompt: text ending in [X,Y,...]:
                if let Some(choice) = detect_choice(&accumulated) {
                    app.emit("game-choice", choice).ok();
                    accumulated.clear();
                } else if accumulated.contains('\n') {
                    // Keep only the last incomplete line
                    if let Some(last_newline) = accumulated.rfind('\n') {
                        accumulated = accumulated[last_newline + 1..].to_string();
                    }
                }
            }
            Err(_) => break,
        }
    }

    app.emit("game-exited", ()).ok();
}

/// Detect a CHOICE.EXE-style prompt in accumulated output.
/// Returns Some(ChoicePayload) if found.
fn detect_choice(text: &str) -> Option<ChoicePayload> {
    // Match text ending with [...]: optionally followed by whitespace
    // e.g. "Play again? [Y,N]:" or "Select [1,2,3,4,5]:"
    let trimmed = text.trim_end_matches(|c: char| c == ' ' || c == '\t');
    if !trimmed.ends_with(':') && !trimmed.ends_with(']') {
        return None;
    }

    // Find the last [...] block
    let bracket_end = trimmed.rfind(']')?;
    let bracket_start = trimmed[..bracket_end].rfind('[')?;
    let inner = &trimmed[bracket_start + 1..bracket_end];

    // Must contain only letters/numbers/commas
    if !inner.chars().all(|c| c.is_alphanumeric() || c == ',') || inner.is_empty() {
        return None;
    }

    let options: Vec<String> = inner
        .split(',')
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty())
        .collect();

    if options.is_empty() || options.len() > 10 {
        return None;
    }

    let message = text[..bracket_start]
        .trim_start_matches(|c: char| c == '\r' || c == '\n')
        .trim_end()
        .to_string();

    Some(ChoicePayload { message, options })
}

#[derive(Clone, serde::Serialize)]
pub struct ChoicePayload {
    pub message: String,
    pub options: Vec<String>,
}

#[tauri::command]
pub fn send_game_input(state: State<AppState>, input: String) -> Result<(), String> {
    let mut guard = state.game_stdin.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut stdin) = *guard {
        let to_write = if input.len() == 1 {
            // Single char: send just the char (CHOICE reads one char without Enter)
            input.into_bytes()
        } else {
            let mut b = input.into_bytes();
            b.push(b'\n');
            b
        };
        stdin.write_all(&to_write).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn kill_game(state: State<AppState>) -> Result<(), String> {
    kill_current_game(&state);
    Ok(())
}

/// Kill the tracked game process tree using taskkill.
pub fn kill_current_game(state: &AppState) {
    // Close stdin first
    if let Ok(mut guard) = state.game_stdin.lock() {
        guard.take(); // drop closes the handle
    }

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
