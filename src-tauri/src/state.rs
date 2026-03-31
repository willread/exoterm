use rusqlite::Connection;
use std::sync::Mutex;

use crate::models::AppConfig;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub config: Mutex<AppConfig>,
}
