use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use tauri::{AppHandle, Emitter, State};

use crate::state::AppState;

/// The choice.bat shim that replaces CHOICE.EXE.
/// It outputs a protocol string our app reads, then polls a temp file for the response.
/// The Rust send_game_input command writes the user's choice to %EXO_CHOICE_DIR%\choice_response.txt
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
echo ##CHOICE##!M!##!C!##
del "%EXO_CHOICE_DIR%\choice_response.txt" 2>nul
:waitloop
if exist "%EXO_CHOICE_DIR%\choice_response.txt" (
    set /p "R=" < "%EXO_CHOICE_DIR%\choice_response.txt"
    del "%EXO_CHOICE_DIR%\choice_response.txt" 2>nul
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

    let shim_path = shims_dir.join("choice.bat");
    std::fs::write(&shim_path, CHOICE_SHIM).map_err(|e| e.to_string())?;

    Ok(shims_dir)
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

    // Set up the CHOICE shim so CHOICE.EXE never runs
    let shims_dir = ensure_choice_shim()?;

    // Store shims_dir so send_game_input can write the response file
    *state.choice_dir.lock().map_err(|e| e.to_string())? = Some(shims_dir.clone());

    // Prepend shims dir to PATH so our choice.bat overrides the real CHOICE.EXE
    let current_path = std::env::var("PATH").unwrap_or_default();
    let new_path = format!("{};{}", shims_dir.to_string_lossy(), current_path);

    let mut child = Command::new("cmd")
        .args(["/C", &full_path.to_string_lossy()])
        .current_dir(&work_dir)
        .env("PATH", &new_path)
        .env("EXO_CHOICE_DIR", shims_dir.to_string_lossy().as_ref())
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

    // Wait for child in background so it doesn't become a zombie
    thread::spawn(move || {
        let _ = child.wait();
    });

    // Spawn stdout reader thread
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

/// Read from a process output stream and detect our CHOICE shim protocol.
fn read_output_stream<R: Read + Send + 'static>(stream: R, app: AppHandle) {
    let mut buf = [0u8; 256];
    let mut accumulated = String::new();
    let mut reader = stream;

    loop {
        match reader.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => {
                let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                accumulated.push_str(&chunk);

                // Check for our CHOICE shim protocol: ##CHOICE##message##options##
                if let Some(choice) = detect_choice_protocol(&accumulated) {
                    app.emit("game-choice", choice).ok();
                    accumulated.clear();
                } else if accumulated.len() > 4096 {
                    // Prevent unbounded accumulation
                    accumulated = accumulated[accumulated.len() - 512..].to_string();
                }
            }
            Err(_) => break,
        }
    }

    app.emit("game-exited", ()).ok();
}

/// Detect our choice.bat protocol: ##CHOICE##message##options##
fn detect_choice_protocol(text: &str) -> Option<ChoicePayload> {
    let marker = "##CHOICE##";
    let start = text.find(marker)?;
    let after = &text[start + marker.len()..];

    // Find ##options## — message is between first ## and second ##
    let parts: Vec<&str> = after.splitn(3, "##").collect();
    if parts.len() < 2 {
        return None;
    }

    let message = parts[0].trim().to_string();
    let options_str = parts[1].trim();

    // Options is a string like "YN" — each character is an option
    let options: Vec<String> = options_str
        .chars()
        .filter(|c| c.is_alphanumeric())
        .map(|c| c.to_uppercase().to_string())
        .collect();

    if options.is_empty() {
        return None;
    }

    Some(ChoicePayload { message, options })
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
        // Write just the first character (what set /p will read)
        let first_char = input.chars().next().map(|c| c.to_string()).unwrap_or_default();
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
    // Close stdin first
    if let Ok(mut guard) = state.game_stdin.lock() {
        guard.take();
    }

    // Clean up any pending choice response file
    if let Ok(mut guard) = state.choice_dir.lock() {
        if let Some(ref dir) = *guard {
            let _ = std::fs::remove_file(dir.join("choice_response.txt"));
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
