use rusqlite::Connection;
use std::process::ChildStdin;
use std::sync::Mutex;

use crate::models::AppConfig;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub config: Mutex<AppConfig>,
    /// PID of the currently running game process (for taskkill)
    pub game_pid: Mutex<Option<u32>>,
    /// Stdin handle of the game process (for sending choices)
    pub game_stdin: Mutex<Option<ChildStdin>>,
}
