use quick_xml::events::Event;
use quick_xml::reader::Reader;
use rusqlite::Connection;
use std::collections::HashMap;
use std::path::Path;

/// Determines the content type based on the platform XML filename.
fn content_type_from_filename(filename: &str) -> &str {
    let lower = filename.to_lowercase();
    if lower.contains("book") {
        "Book"
    } else if lower.contains("magazine") || lower.contains("newsletter") {
        "Magazine"
    } else if lower.contains("video") {
        "Video"
    } else if lower.contains("soundtrack") || lower.contains("sound") {
        "Soundtrack"
    } else if lower.contains("catalog") {
        "Catalog"
    } else {
        "Game"
    }
}

/// Classify a file path into a kind string based on its extension.
fn extra_kind(path: &str) -> &'static str {
    let lower = path.to_lowercase();
    if lower.ends_with(".pdf") {
        "pdf"
    } else if lower.ends_with(".png") || lower.ends_with(".jpg") || lower.ends_with(".jpeg")
        || lower.ends_with(".gif") || lower.ends_with(".bmp") || lower.ends_with(".webp")
    {
        "image"
    } else if lower.ends_with(".mp4") || lower.ends_with(".avi") || lower.ends_with(".mkv")
        || lower.ends_with(".mov") || lower.ends_with(".wmv") || lower.ends_with(".webm")
    {
        "video"
    } else if lower.ends_with(".mp3") || lower.ends_with(".wav") || lower.ends_with(".ogg")
        || lower.ends_with(".flac") || lower.ends_with(".m4a")
    {
        "audio"
    } else if lower.ends_with(".txt") || lower.ends_with(".nfo") || lower.ends_with(".doc")
        || lower.ends_with(".rtf") || lower.ends_with(".htm") || lower.ends_with(".html")
    {
        "text"
    } else {
        "other"
    }
}

/// Scans a single platform XML file and inserts games (and their extras) into the database.
/// Returns the number of games inserted.
pub fn parse_platform_xml(
    conn: &Connection,
    collection_id: i64,
    xml_path: &Path,
    on_progress: &mut dyn FnMut(usize),
) -> Result<usize, String> {
    let filename = xml_path
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or("");
    let content_type = content_type_from_filename(filename);

    let mut reader = Reader::from_file(xml_path).map_err(|e| format!("Failed to open XML: {}", e))?;
    reader.config_mut().trim_text(true);

    let mut buf = Vec::with_capacity(8192);
    let mut in_game = false;
    let mut in_addon = false;
    let mut current_field: Option<String> = None;
    let mut fields: HashMap<String, String> = HashMap::new();
    let mut addon_fields: HashMap<String, String> = HashMap::new();
    // Collect (lb_game_id, name, path, region) for later bulk insert
    let mut addon_buffer: Vec<(String, String, String, Option<String>)> = Vec::new();
    let mut count: usize = 0;
    let mut batch_count: usize = 0;

    // Start a transaction for batch inserts
    conn.execute("BEGIN", []).map_err(|e| e.to_string())?;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if tag == "Game" {
                    in_game = true;
                    fields.clear();
                } else if tag == "AdditionalApplication" {
                    in_addon = true;
                    addon_fields.clear();
                } else if in_game || in_addon {
                    current_field = Some(tag);
                }
            }
            Ok(Event::End(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if tag == "Game" && in_game {
                    in_game = false;
                    current_field = None;

                    // Insert game into database
                    if let Some(app_path) = fields.get("ApplicationPath") {
                        if !app_path.is_empty() {
                            let title = fields
                                .get("Title")
                                .or_else(|| fields.get("Name"))
                                .cloned()
                                .unwrap_or_default();

                            if !title.is_empty() {
                                let title_normalized = title.to_lowercase();
                                let release_year = fields
                                    .get("ReleaseDate")
                                    .and_then(|d| d.get(0..4))
                                    .and_then(|y| y.parse::<i32>().ok());

                                let favorite = fields
                                    .get("Favorite")
                                    .map(|v| v == "true")
                                    .unwrap_or(false);

                                let genre = fields.get("Genres")
                                    .or_else(|| fields.get("Genre"))
                                    .map(|g| g.trim().to_string())
                                    .filter(|g| !g.is_empty());

                                let result = conn.execute(
                                    "INSERT INTO games (
                                        collection_id, title, sort_title, platform, developer,
                                        publisher, release_year, genre, series, max_players,
                                        play_mode, overview, application_path, root_folder,
                                        source, favorite, content_type, lb_id, lb_database_id,
                                        title_normalized
                                    ) VALUES (
                                        ?1, ?2, ?3, ?4, ?5,
                                        ?6, ?7, ?8, ?9, ?10,
                                        ?11, ?12, ?13, ?14,
                                        ?15, ?16, ?17, ?18, ?19,
                                        ?20
                                    )",
                                    rusqlite::params![
                                        collection_id,
                                        title,
                                        fields.get("SortTitle").filter(|s| !s.is_empty()),
                                        fields.get("Platform").map(|s| s.as_str()).unwrap_or(""),
                                        fields.get("Developer").filter(|s| !s.is_empty()),
                                        fields.get("Publisher").filter(|s| !s.is_empty()),
                                        release_year,
                                        genre,
                                        fields.get("Series").filter(|s| !s.is_empty()),
                                        fields.get("MaxPlayers").filter(|s| !s.is_empty()),
                                        fields.get("PlayMode").filter(|s| !s.is_empty()),
                                        fields.get("Notes").or_else(|| fields.get("Overview")).filter(|s| !s.is_empty()),
                                        app_path,
                                        fields.get("RootFolder").filter(|s| !s.is_empty()),
                                        fields.get("Source").filter(|s| !s.is_empty()),
                                        favorite as i32,
                                        content_type,
                                        fields.get("ID").filter(|s| !s.is_empty()),
                                        fields.get("DatabaseID").filter(|s| !s.is_empty()),
                                        title_normalized,
                                    ],
                                );

                                if let Ok(_) = result {
                                    let game_id = conn.last_insert_rowid();
                                    count += 1;
                                    batch_count += 1;

                                    // Insert ManualPath as an extra if present and not missing
                                    let missing = fields.get("MissingManual").map(|v| v == "true").unwrap_or(false);
                                    if !missing {
                                        if let Some(manual_path) = fields.get("ManualPath").filter(|p| !p.is_empty()) {
                                            let kind = extra_kind(manual_path);
                                            // Derive a display name from the filename
                                            let name = std::path::Path::new(&manual_path.replace('\\', "/"))
                                                .file_stem()
                                                .map(|s| s.to_string_lossy().to_string())
                                                .unwrap_or_else(|| "Manual".to_string());
                                            let _ = conn.execute(
                                                "INSERT INTO game_extras (game_id, name, path, region, kind) VALUES (?1, ?2, ?3, NULL, ?4)",
                                                rusqlite::params![game_id, name, manual_path, kind],
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Commit batch every 5000 games
                    if batch_count >= 5000 {
                        conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
                        conn.execute("BEGIN", []).map_err(|e| e.to_string())?;
                        batch_count = 0;
                        on_progress(count);
                    }
                } else if tag == "AdditionalApplication" && in_addon {
                    in_addon = false;
                    current_field = None;
                    // Buffer the extra — we'll insert after all games are committed
                    // so lb_id lookups are guaranteed to work.
                    if let (Some(game_lb_id), Some(name), Some(path)) = (
                        addon_fields.get("GameID").or_else(|| addon_fields.get("GameId")),
                        addon_fields.get("Name"),
                        addon_fields.get("ApplicationPath"),
                    ) {
                        if !game_lb_id.is_empty() && !name.is_empty() && !path.is_empty() {
                            addon_buffer.push((
                                game_lb_id.clone(),
                                name.clone(),
                                path.clone(),
                                addon_fields.get("Region").filter(|r| !r.is_empty()).cloned(),
                            ));
                        }
                    }
                } else if in_game || in_addon {
                    current_field = None;
                }
            }
            Ok(Event::Text(ref e)) => {
                if in_game || in_addon {
                    if let Some(ref field) = current_field {
                        let text = e.unescape().unwrap_or_default().to_string();
                        if in_game {
                            fields.insert(field.clone(), text);
                        } else {
                            addon_fields.insert(field.clone(), text);
                        }
                    }
                }
            }
            Ok(Event::Empty(ref e)) => {
                // Self-closing tags like <Genres /> - ignore
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if tag == "Game" {
                    // Empty game element, skip
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => {
                // Log error but continue parsing
                eprintln!("XML parse error at position {}: {}", reader.buffer_position(), e);
            }
            _ => {}
        }
        buf.clear();
    }

    // Commit remaining game batch
    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
    on_progress(count);

    // Bulk-insert extras now that all games (and their lb_ids) are committed
    if !addon_buffer.is_empty() {
        conn.execute("BEGIN", []).map_err(|e| e.to_string())?;
        for (lb_game_id, name, path, region) in &addon_buffer {
            if let Ok(game_id) = conn.query_row(
                "SELECT id FROM games WHERE lb_id = ? AND collection_id = ?",
                rusqlite::params![lb_game_id, collection_id],
                |r| r.get::<_, i64>(0),
            ) {
                let kind = extra_kind(path);
                let _ = conn.execute(
                    "INSERT INTO game_extras (game_id, name, path, region, kind)
                     VALUES (?1, ?2, ?3, ?4, ?5)",
                    rusqlite::params![game_id, name, path, region, kind],
                );
            }
        }
        conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
    }

    Ok(count)
}

/// Scans all platform XML files in a collection's Data/Platforms/ directory.
pub fn scan_collection(
    conn: &Connection,
    collection_id: i64,
    collection_path: &str,
    on_progress: &mut dyn FnMut(usize, &str),
) -> Result<usize, String> {
    let platforms_dir = Path::new(collection_path).join("Data").join("Platforms");
    if !platforms_dir.exists() {
        return Err(format!(
            "Platforms directory not found: {}",
            platforms_dir.display()
        ));
    }

    // Clear existing games for this collection
    conn.execute("DELETE FROM games WHERE collection_id = ?", [collection_id])
        .map_err(|e| e.to_string())?;

    let mut total_count: usize = 0;

    // Iterate over XML files in Data/Platforms/
    let entries = std::fs::read_dir(&platforms_dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|e| e.to_str()) == Some("xml") {
            let filename = path
                .file_name()
                .and_then(|f| f.to_str())
                .unwrap_or("unknown")
                .to_string();

            on_progress(total_count, &filename);

            let count = parse_platform_xml(conn, collection_id, &path, &mut |c| {
                on_progress(total_count + c, &filename);
            })?;

            total_count += count;
        }
    }

    // Rebuild FTS index
    let _ = conn.execute("INSERT INTO games_fts(games_fts) VALUES('rebuild')", []);

    Ok(total_count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn make_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             CREATE TABLE collections (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 name TEXT NOT NULL,
                 path TEXT NOT NULL UNIQUE,
                 last_scanned INTEGER
             );
             CREATE TABLE games (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 collection_id INTEGER NOT NULL,
                 title TEXT NOT NULL,
                 sort_title TEXT,
                 platform TEXT NOT NULL DEFAULT '',
                 developer TEXT,
                 publisher TEXT,
                 release_year INTEGER,
                 genre TEXT,
                 series TEXT,
                 max_players TEXT,
                 play_mode TEXT,
                 overview TEXT,
                 application_path TEXT NOT NULL,
                 root_folder TEXT,
                 source TEXT,
                 favorite INTEGER NOT NULL DEFAULT 0,
                 content_type TEXT NOT NULL DEFAULT 'Game',
                 lb_id TEXT,
                 lb_database_id TEXT,
                 title_normalized TEXT
             );
             CREATE TABLE game_extras (
                 id      INTEGER PRIMARY KEY AUTOINCREMENT,
                 game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
                 name    TEXT NOT NULL,
                 path    TEXT NOT NULL,
                 region  TEXT,
                 kind    TEXT NOT NULL DEFAULT 'other'
             );",
        )
        .unwrap();
        conn
    }

    #[test]
    fn test_content_type_from_filename() {
        assert_eq!(content_type_from_filename("MS-DOS.xml"), "Game");
        assert_eq!(content_type_from_filename("MS-DOS Books.xml"), "Book");
        assert_eq!(
            content_type_from_filename("MS-DOS Magazines & Newsletters.xml"),
            "Magazine"
        );
        assert_eq!(content_type_from_filename("MS-DOS Videos.xml"), "Video");
        assert_eq!(
            content_type_from_filename("Soundtracks.xml"),
            "Soundtrack"
        );
        assert_eq!(
            content_type_from_filename("MS-DOS Catalogs.xml"),
            "Catalog"
        );
        assert_eq!(content_type_from_filename("Windows 95.xml"), "Game");
    }

    #[test]
    fn test_parse_minimal_xml() {
        let conn = make_db();
        conn.execute(
            "INSERT INTO collections (name, path) VALUES ('Test', '/test')",
            [],
        )
        .unwrap();
        let collection_id: i64 = conn
            .query_row("SELECT id FROM collections WHERE name = 'Test'", [], |r| {
                r.get(0)
            })
            .unwrap();

        let xml = r#"<?xml version="1.0" standalone="yes"?>
<LaunchBox>
  <Game>
    <Title>Doom</Title>
    <Platform>MS-DOS</Platform>
    <Developer>id Software</Developer>
    <Publisher>GT Interactive</Publisher>
    <ReleaseDate>1993-12-10T00:00:00</ReleaseDate>
    <Genres>Action</Genres>
    <ApplicationPath>eXo\eXoDOS\!dos\Doom\Doom.bat</ApplicationPath>
    <RootFolder>eXo\eXoDOS\!dos\Doom</RootFolder>
    <Favorite>true</Favorite>
    <Notes>A classic FPS game.</Notes>
  </Game>
  <Game>
    <Title>Quake</Title>
    <Platform>MS-DOS</Platform>
    <Developer>id Software</Developer>
    <ApplicationPath>eXo\eXoDOS\!dos\Quake\Quake.bat</ApplicationPath>
    <Favorite>false</Favorite>
  </Game>
</LaunchBox>"#;

        // Write to a temp file
        let tmp = std::env::temp_dir().join("test_minimal.xml");
        std::fs::write(&tmp, xml).unwrap();

        let mut progress_calls = 0usize;
        let count = parse_platform_xml(&conn, collection_id, &tmp, &mut |_| {
            progress_calls += 1;
        })
        .unwrap();

        assert_eq!(count, 2, "Should have inserted 2 games");

        let titles: Vec<String> = {
            let mut stmt = conn
                .prepare("SELECT title FROM games ORDER BY title")
                .unwrap();
            stmt.query_map([], |r| r.get(0))
                .unwrap()
                .collect::<rusqlite::Result<Vec<_>>>()
                .unwrap()
        };
        assert_eq!(titles, vec!["Doom", "Quake"]);

        let (fav, release_year, genre, developer): (i32, Option<i32>, Option<String>, Option<String>) = conn
            .query_row(
                "SELECT favorite, release_year, genre, developer FROM games WHERE title = 'Doom'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            )
            .unwrap();

        assert_eq!(fav, 1, "Doom should be a favorite");
        assert_eq!(release_year, Some(1993));
        assert_eq!(genre.as_deref(), Some("Action"));
        assert_eq!(developer.as_deref(), Some("id Software"));

        std::fs::remove_file(&tmp).ok();
    }

    #[test]
    fn test_parse_skips_games_without_application_path() {
        let conn = make_db();
        conn.execute(
            "INSERT INTO collections (name, path) VALUES ('Test', '/test2')",
            [],
        )
        .unwrap();
        let collection_id: i64 = conn
            .query_row("SELECT id FROM collections WHERE name = 'Test'", [], |r| {
                r.get(0)
            })
            .unwrap();

        let xml = r#"<?xml version="1.0" standalone="yes"?>
<LaunchBox>
  <Game>
    <Title>No Path Game</Title>
    <Platform>MS-DOS</Platform>
  </Game>
  <Game>
    <Title>With Path Game</Title>
    <Platform>MS-DOS</Platform>
    <ApplicationPath>eXo\eXoDOS\!dos\Test\Test.bat</ApplicationPath>
  </Game>
</LaunchBox>"#;

        let tmp = std::env::temp_dir().join("test_no_path.xml");
        std::fs::write(&tmp, xml).unwrap();

        let count = parse_platform_xml(&conn, collection_id, &tmp, &mut |_| {}).unwrap();
        assert_eq!(count, 1, "Only game with ApplicationPath should be inserted");

        std::fs::remove_file(&tmp).ok();
    }

    #[test]
    fn test_parse_favorite_false_default() {
        let conn = make_db();
        conn.execute(
            "INSERT INTO collections (name, path) VALUES ('Test', '/test3')",
            [],
        )
        .unwrap();
        let collection_id: i64 = conn
            .query_row("SELECT id FROM collections WHERE name = 'Test'", [], |r| {
                r.get(0)
            })
            .unwrap();

        let xml = r#"<?xml version="1.0" standalone="yes"?>
<LaunchBox>
  <Game>
    <Title>Test Game</Title>
    <Platform>MS-DOS</Platform>
    <ApplicationPath>eXo\eXoDOS\!dos\Test\Test.bat</ApplicationPath>
  </Game>
</LaunchBox>"#;

        let tmp = std::env::temp_dir().join("test_fav_default.xml");
        std::fs::write(&tmp, xml).unwrap();

        parse_platform_xml(&conn, collection_id, &tmp, &mut |_| {}).unwrap();

        let fav: i32 = conn
            .query_row("SELECT favorite FROM games WHERE title = 'Test Game'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(fav, 0, "Favorite should default to false");

        std::fs::remove_file(&tmp).ok();
    }

    #[test]
    fn test_extra_kind_classification() {
        assert_eq!(extra_kind("Manual.pdf"), "pdf");
        assert_eq!(extra_kind("MAP.PDF"), "pdf");
        assert_eq!(extra_kind("screenshot.png"), "image");
        assert_eq!(extra_kind("cover.jpg"), "image");
        assert_eq!(extra_kind("COVER.JPEG"), "image");
        assert_eq!(extra_kind("intro.mp4"), "video");
        assert_eq!(extra_kind("gameplay.avi"), "video");
        assert_eq!(extra_kind("soundtrack.mp3"), "audio");
        assert_eq!(extra_kind("music.ogg"), "audio");
        assert_eq!(extra_kind("readme.txt"), "text");
        assert_eq!(extra_kind("info.nfo"), "text");
        assert_eq!(extra_kind("unknown.xyz"), "other");
    }

    #[test]
    fn test_parse_additional_applications() {
        let conn = make_db();
        conn.execute(
            "INSERT INTO collections (name, path) VALUES ('Test', '/test_extras')",
            [],
        )
        .unwrap();
        let collection_id: i64 = conn
            .query_row("SELECT id FROM collections WHERE name = 'Test'", [], |r| {
                r.get(0)
            })
            .unwrap();

        let xml = r#"<?xml version="1.0" standalone="yes"?>
<LaunchBox>
  <Game>
    <ID>doom2-guid-123</ID>
    <Title>DOOM II: Hell on Earth</Title>
    <Platform>MS-DOS</Platform>
    <ApplicationPath>eXo\eXoDOS\!dos\DOOM II\DOOM II (1994).bat</ApplicationPath>
  </Game>
  <AdditionalApplication>
    <GameId>doom2-guid-123</GameId>
    <Name>DOOM II Manual</Name>
    <ApplicationPath>Extras\DOOM II\DOOM II Manual.pdf</ApplicationPath>
    <Region>English</Region>
  </AdditionalApplication>
  <AdditionalApplication>
    <GameId>doom2-guid-123</GameId>
    <Name>Cheats PC Gamer 1995-02 page 149</Name>
    <ApplicationPath>Extras\DOOM II\Cheats PC Gamer 1995-02 page 149.pdf</ApplicationPath>
    <Region>English</Region>
  </AdditionalApplication>
  <AdditionalApplication>
    <GameId>doom2-guid-123</GameId>
    <Name>Level Map</Name>
    <ApplicationPath>Extras\DOOM II\Level Map.png</ApplicationPath>
  </AdditionalApplication>
</LaunchBox>"#;

        let tmp = std::env::temp_dir().join("test_extras.xml");
        std::fs::write(&tmp, xml).unwrap();

        let count = parse_platform_xml(&conn, collection_id, &tmp, &mut |_| {}).unwrap();
        assert_eq!(count, 1, "One game should be inserted");

        let game_id: i64 = conn
            .query_row("SELECT id FROM games WHERE title = 'DOOM II: Hell on Earth'", [], |r| r.get(0))
            .unwrap();

        let extras: Vec<(String, String, Option<String>, String)> = {
            let mut stmt = conn
                .prepare("SELECT name, path, region, kind FROM game_extras WHERE game_id = ? ORDER BY name")
                .unwrap();
            stmt.query_map([game_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)))
                .unwrap()
                .collect::<rusqlite::Result<Vec<_>>>()
                .unwrap()
        };

        assert_eq!(extras.len(), 3, "All three extras should be inserted");

        // Sorted by name: Cheats, DOOM II Manual, Level Map
        assert_eq!(extras[0].0, "Cheats PC Gamer 1995-02 page 149");
        assert_eq!(extras[0].3, "pdf");
        assert_eq!(extras[0].2.as_deref(), Some("English"));

        assert_eq!(extras[1].0, "DOOM II Manual");
        assert_eq!(extras[1].3, "pdf");

        assert_eq!(extras[2].0, "Level Map");
        assert_eq!(extras[2].3, "image");
        assert!(extras[2].2.is_none(), "No region for Level Map");

        std::fs::remove_file(&tmp).ok();
    }

    #[test]
    fn test_extras_ignored_for_unknown_game_lb_id() {
        let conn = make_db();
        conn.execute(
            "INSERT INTO collections (name, path) VALUES ('Test', '/test_extras2')",
            [],
        )
        .unwrap();
        let collection_id: i64 = conn
            .query_row("SELECT id FROM collections WHERE name = 'Test'", [], |r| r.get(0))
            .unwrap();

        let xml = r#"<?xml version="1.0" standalone="yes"?>
<LaunchBox>
  <Game>
    <ID>real-game-id</ID>
    <Title>Real Game</Title>
    <Platform>MS-DOS</Platform>
    <ApplicationPath>eXo\eXoDOS\!dos\Real\Real.bat</ApplicationPath>
  </Game>
  <AdditionalApplication>
    <GameId>nonexistent-guid</GameId>
    <Name>Orphan Extra</Name>
    <ApplicationPath>Extras\Real\Orphan.pdf</ApplicationPath>
  </AdditionalApplication>
</LaunchBox>"#;

        let tmp = std::env::temp_dir().join("test_extras_orphan.xml");
        std::fs::write(&tmp, xml).unwrap();

        parse_platform_xml(&conn, collection_id, &tmp, &mut |_| {}).unwrap();

        let extra_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM game_extras", [], |r| r.get(0))
            .unwrap();
        assert_eq!(extra_count, 0, "Orphaned extras (unknown GameId) should be silently dropped");

        std::fs::remove_file(&tmp).ok();
    }
}
