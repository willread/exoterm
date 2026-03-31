use rusqlite::Connection;
use std::path::PathBuf;
use std::process::ChildStdin;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

use crate::models::AppConfig;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub config: Mutex<AppConfig>,
    /// PID of the currently running game process (for taskkill)
    pub game_pid: Mutex<Option<u32>>,
    /// Stdin handle of the game process (for sending choices)
    pub game_stdin: Mutex<Option<ChildStdin>>,
    /// Directory where the CHOICE shim polls for responses
    pub choice_dir: Mutex<Option<PathBuf>>,
    /// Signal to stop the choice file poller thread
    pub game_running: Arc<AtomicBool>,
}
