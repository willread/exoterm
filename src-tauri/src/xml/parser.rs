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

/// Scans a single platform XML file and inserts games into the database.
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
    let mut current_field: Option<String> = None;
    let mut fields: HashMap<String, String> = HashMap::new();
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
                } else if in_game {
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

                                if result.is_ok() {
                                    count += 1;
                                    batch_count += 1;
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
                } else if in_game {
                    current_field = None;
                }
            }
            Ok(Event::Text(ref e)) => {
                if in_game {
                    if let Some(ref field) = current_field {
                        let text = e.unescape().unwrap_or_default().to_string();
                        fields.insert(field.clone(), text);
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

    // Commit remaining batch
    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
    on_progress(count);

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
}
