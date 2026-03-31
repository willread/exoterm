use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

use crate::state::AppState;

/// The choice.bat shim that replaces CHOICE.EXE.
/// Instead of going through stdout (which requires piping and breaks console-based games),
/// it writes request files that our Rust poller detects, then polls for a response file.
const CHOICE_SHIM: &str = r#"@echo off
setlocal enabledelayedexpansion
set "C=YN"
set "M="
:parse
if "%~1"=="" goto :run
if /i "%~1"=="/N" (shift & goto :parse)
if /i "%~1"=="/CS" (shift & goto :parse)
if /i "%~1"=="/C" goto :setc
if /i "%~1"=="/M" goto :setm
if /i "%~1"=="/T" goto :skip2
if /i "%~1"=="/D" goto :skip2
set "A=%~1"
if /i "!A:~0,3!"=="/C:" (set "C=!A:~3!" & shift & goto :parse)
if /i "!A:~0,3!"=="/M:" (set "M=!A:~3!" & shift & goto :parse)
if /i "!A:~0,3!"=="/T:" (shift & goto :parse)
if /i "!A:~0,3!"=="/D:" (shift & goto :parse)
shift
goto :parse
:setc
shift
set "C=%~1"
shift
goto :parse
:setm
shift
set "M=%~1"
shift
goto :parse
:skip2
shift
shift
goto :parse
:run
rem Write request files for the Rust poller to detect
echo !M!>"%EXO_CHOICE_DIR%\choice_request_msg.txt"
echo !C!>"%EXO_CHOICE_DIR%\choice_request_opts.txt"
del "%EXO_CHOICE_DIR%\choice_response.txt" 2>nul
:waitloop
if exist "%EXO_CHOICE_DIR%\choice_response.txt" (
    set /p "R=" < "%EXO_CHOICE_DIR%\choice_response.txt"
    del "%EXO_CHOICE_DIR%\choice_response.txt" 2>nul
    del "%EXO_CHOICE_DIR%\choice_request_msg.txt" 2>nul
    del "%EXO_CHOICE_DIR%\choice_request_opts.txt" 2>nul
    goto :calc
)
ping -n 1 -w 200 127.0.0.1 >nul 2>&1
goto :waitloop
:calc
set "R=!R:~0,1!"
if not defined R set "R=!C:~0,1!"
set /a "E=0"
set /a "I=0"
:calcloop
call set "X=%%C:~!I!,1%%"
if "!X!"=="" exit /b 0
set /a "E+=1"
if /i "!X!"=="!R!" exit /b !E!
set /a "I+=1"
goto :calcloop
"#;

/// Ensure the choice.bat shim exists in the app data shims directory.
/// Returns the shims directory path.
fn ensure_choice_shim() -> Result<PathBuf, String> {
    let shims_dir = crate::dirs_next()
        .map_err(|e| format!("Failed to get app dir: {}", e))?
        .join("shims");
    std::fs::create_dir_all(&shims_dir).map_err(|e| e.to_string())?;

    // Write both .bat and .cmd versions for maximum coverage.
    // When a batch file calls `CHOICE`, Windows checks PATHEXT extensions in order:
    // .COM, .EXE, .BAT, .CMD — our shims dir is first on PATH so .BAT wins.
    // Writing .CMD too covers edge cases.
    let shim_bat = shims_dir.join("choice.bat");
    std::fs::write(&shim_bat, CHOICE_SHIM).map_err(|e| e.to_string())?;

    let shim_cmd = shims_dir.join("choice.cmd");
    std::fs::write(&shim_cmd, CHOICE_SHIM).map_err(|e| e.to_string())?;

    Ok(shims_dir)
}

/// Clean up any leftover choice request/response files.
fn cleanup_choice_files(dir: &PathBuf) {
    let _ = std::fs::remove_file(dir.join("choice_request_msg.txt"));
    let _ = std::fs::remove_file(dir.join("choice_request_opts.txt"));
    let _ = std::fs::remove_file(dir.join("choice_response.txt"));
}

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

    // Set up the CHOICE shim so CHOICE.EXE calls are intercepted
    let shims_dir = ensure_choice_shim()?;

    // Clean up any leftover request files from previous runs
    cleanup_choice_files(&shims_dir);

    // Store shims_dir so send_game_input can write the response file
    *state.choice_dir.lock().map_err(|e| e.to_string())? = Some(shims_dir.clone());

    // Mark game as running (used by poller thread to know when to stop)
    state.game_running.store(true, Ordering::SeqCst);
    let running_flag = Arc::clone(&state.game_running);

    // Prepend shims dir to PATH so our choice.bat overrides the real CHOICE.EXE
    let current_path = std::env::var("PATH").unwrap_or_default();
    let new_path = format!("{};{}", shims_dir.to_string_lossy(), current_path);

    // Launch the game WITHOUT piping stdout/stderr.
    // This lets the game process own its console window (critical for DOSBox etc).
    // CHOICE communication happens entirely via files, not stdout.
    let child = Command::new("cmd")
        .args(["/C", &full_path.to_string_lossy()])
        .current_dir(&work_dir)
        .env("PATH", &new_path)
        .env("EXO_CHOICE_DIR", shims_dir.to_string_lossy().as_ref())
        .stdin(Stdio::null())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("Failed to launch game: {}", e))?;

    let pid = child.id();

    // Store pid (no stdin handle needed — CHOICE uses files now)
    *state.game_pid.lock().map_err(|e| e.to_string())? = Some(pid);
    *state.game_stdin.lock().map_err(|e| e.to_string())? = None;

    // Wait for child in background; emit game-exited when the process exits
    {
        let app_handle = app.clone();
        let choice_dir = shims_dir.clone();
        let flag = Arc::clone(&running_flag);
        let mut child = child;
        thread::spawn(move || {
            let _ = child.wait();
            // Signal the poller to stop
            flag.store(false, Ordering::SeqCst);
            // Clean up choice files
            cleanup_choice_files(&choice_dir);
            app_handle.emit("game-exited", ()).ok();
        });
    }

    // Spawn a file-poller thread that watches for choice request files from the shim
    {
        let app_handle = app.clone();
        let choice_dir = shims_dir;
        let flag = running_flag;
        thread::spawn(move || {
            poll_choice_requests(choice_dir, app_handle, flag);
        });
    }

    app.emit("game-started", ()).ok();
    Ok(format!("Launched: {}", full_path.display()))
}

/// Poll for choice request files written by the CHOICE.BAT shim.
/// When both choice_request_msg.txt and choice_request_opts.txt exist,
/// emit a "game-choice" event to the frontend.
fn poll_choice_requests(dir: PathBuf, app: AppHandle, running: Arc<AtomicBool>) {
    let msg_path = dir.join("choice_request_msg.txt");
    let opts_path = dir.join("choice_request_opts.txt");
    let response_path = dir.join("choice_response.txt");

    while running.load(Ordering::SeqCst) {
        thread::sleep(Duration::from_millis(150));

        // Check if both request files exist (written by the CHOICE shim)
        if msg_path.exists() && opts_path.exists() {
            // Small delay to ensure file writes are complete
            thread::sleep(Duration::from_millis(50));

            let message = std::fs::read_to_string(&msg_path)
                .unwrap_or_default()
                .trim()
                .to_string();
            let options_str = std::fs::read_to_string(&opts_path)
                .unwrap_or_default()
                .trim()
                .to_string();

            // Options is a string like "YN" — each character is a choice
            let options: Vec<String> = options_str
                .chars()
                .filter(|c| c.is_alphanumeric())
                .map(|c| c.to_uppercase().to_string())
                .collect();

            if !options.is_empty() {
                let payload = ChoicePayload {
                    message: if message.is_empty() {
                        "The game is asking for input:".to_string()
                    } else {
                        message
                    },
                    options,
                };
                app.emit("game-choice", payload).ok();
            }

            // Wait until the user responds (response file appears) or game exits
            while running.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_millis(150));
                if response_path.exists() || !opts_path.exists() {
                    break;
                }
            }
        }
    }
}

#[derive(Clone, serde::Serialize)]
pub struct ChoicePayload {
    pub message: String,
    pub options: Vec<String>,
}

#[tauri::command]
pub fn send_game_input(state: State<AppState>, input: String) -> Result<(), String> {
    // Write the user's choice to the response file so the CHOICE shim can pick it up
    let guard = state.choice_dir.lock().map_err(|e| e.to_string())?;
    if let Some(ref dir) = *guard {
        let response_path = dir.join("choice_response.txt");
        // Write just the first character (what the shim reads via `set /p`)
        let first_char = input
            .chars()
            .next()
            .map(|c| c.to_string())
            .unwrap_or_default();
        std::fs::write(&response_path, first_char).map_err(|e| e.to_string())?;
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
    // Signal poller thread to stop
    state.game_running.store(false, Ordering::SeqCst);

    // Clear stdin handle
    if let Ok(mut guard) = state.game_stdin.lock() {
        guard.take();
    }

    // Clean up any pending choice files
    if let Ok(mut guard) = state.choice_dir.lock() {
        if let Some(ref dir) = *guard {
            cleanup_choice_files(dir);
        }
        guard.take();
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
