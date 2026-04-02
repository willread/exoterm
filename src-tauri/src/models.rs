use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub id: i64,
    pub collection_id: i64,
    pub title: String,
    pub sort_title: Option<String>,
    pub platform: String,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub release_year: Option<i32>,
    pub genre: Option<String>,
    pub series: Option<String>,
    pub max_players: Option<String>,
    pub play_mode: Option<String>,
    pub overview: Option<String>,
    pub application_path: String,
    pub root_folder: Option<String>,
    pub source: Option<String>,
    pub favorite: bool,
    pub content_type: String,
    pub lb_id: Option<String>,
    pub lb_database_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSummary {
    pub id: i64,
    pub title: String,
    pub release_year: Option<i32>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub genre: Option<String>,
    pub platform: String,
    pub favorite: bool,
    pub content_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub games: Vec<GameSummary>,
    pub total_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterOptions {
    pub content_types: Vec<String>,
    pub genres: Vec<String>,
    pub developers: Vec<String>,
    pub publishers: Vec<String>,
    pub years: Vec<i32>,
    pub series: Vec<String>,
    pub platforms: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionInfo {
    pub id: i64,
    pub name: String,
    pub path: String,
    pub game_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub collections: Vec<CollectionPath>,
    pub theme: String,
    pub crt_enabled: bool,
    pub crt_intensity: f32,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            collections: Vec::new(),
            theme: "blue".to_string(),
            crt_enabled: true,
            crt_intensity: 0.5,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionPath {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameImage {
    pub category: String,
    pub data_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameVideo {
    pub name: String,
    pub path: String,
    /// "bat" = extracted from the game's launch script; "dir" = found in Videos/Extras directory
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameExtra {
    pub id: i64,
    pub name: String,
    /// Absolute filesystem path, resolved at query time
    pub path: String,
    pub region: Option<String>,
    /// "pdf" | "image" | "video" | "audio" | "text" | "other"
    pub kind: String,
    /// Whether the file actually exists on disk
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub current: usize,
    pub total_files: usize,
    pub current_file: String,
    pub status: String,
}
