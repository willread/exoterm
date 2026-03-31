use rusqlite::Connection;
use std::process::Child;
use std::sync::Mutex;

use crate::models::AppConfig;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub config: Mutex<AppConfig>,
    pub current_game: Mutex<Option<Child>>,
}
