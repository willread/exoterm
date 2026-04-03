use crate::db::{queries, schema};
use rusqlite::Connection;

fn make_db_with_games() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    schema::initialize(&conn).unwrap();

    conn.execute(
        "INSERT INTO collections (name, path) VALUES ('eXoDOS', 'E:\\Exo\\eXoDOS')",
        [],
    )
    .unwrap();
    let cid: i64 = conn
        .query_row("SELECT id FROM collections", [], |r| r.get(0))
        .unwrap();

    let games: &[(&str, &str, &str, &str, i32, &str, &str, bool)] = &[
        ("Doom", "MS-DOS", "id Software", "GT Interactive", 1993, "Action", "Game", false),
        ("Quake", "MS-DOS", "id Software", "GT Interactive", 1996, "Action", "Game", true),
        ("Wolfenstein 3D", "MS-DOS", "id Software", "Apogee", 1992, "Action", "Game", false),
        ("Sim City", "MS-DOS", "Maxis", "Maxis", 1989, "Strategy", "Game", false),
        ("PC Gamer Issue 1", "MS-DOS", "", "", 1994, "", "Magazine", false),
    ];

    for (title, platform, dev, pub_, year, genre, ct, fav) in games {
        conn.execute(
            "INSERT INTO games (collection_id, title, platform, developer, publisher, release_year, genre, application_path, content_type, favorite, title_normalized)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![
                cid, title, platform,
                if dev.is_empty() { None } else { Some(dev) },
                if pub_.is_empty() { None } else { Some(pub_) },
                year,
                if genre.is_empty() { None } else { Some(genre) },
                format!("eXo\\!dos\\{}\\{}.bat", title, title),
                ct, *fav as i32, title.to_lowercase()
            ],
        )
        .unwrap();
    }

    let _ = conn.execute("INSERT INTO games_fts(games_fts) VALUES('rebuild')", []);
    conn
}

#[test]
fn test_search_returns_all_games_no_filter() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "", "Game", &[], &[], &[], &[], &[], &[],
        false, false, "title", "asc", 0, 100,
    )
    .unwrap();
    assert_eq!(result.total_count, 4);
}

#[test]
fn test_search_filters_by_content_type_magazine() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "", "Magazine", &[], &[], &[], &[], &[], &[],
        false, false, "title", "asc", 0, 100,
    )
    .unwrap();
    assert_eq!(result.total_count, 1);
    assert_eq!(result.games[0].title, "PC Gamer Issue 1");
}

#[test]
fn test_search_all_content_types_when_empty() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "", "", &[], &[], &[], &[], &[], &[],
        false, false, "title", "asc", 0, 100,
    )
    .unwrap();
    assert_eq!(result.total_count, 5);
}

#[test]
fn test_search_by_fts_query() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "doom", "Game", &[], &[], &[], &[], &[], &[],
        false, false, "title", "asc", 0, 100,
    )
    .unwrap();
    assert_eq!(result.total_count, 1);
    assert_eq!(result.games[0].title, "Doom");
}

#[test]
fn test_search_fts_prefix_match() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "qu", "", &[], &[], &[], &[], &[], &[],
        false, false, "title", "asc", 0, 100,
    )
    .unwrap();
    assert_eq!(result.total_count, 1);
    assert_eq!(result.games[0].title, "Quake");
}

#[test]
fn test_filter_by_developer() {
    let conn = make_db_with_games();
    let maxis = "Maxis".to_string();
    let result = queries::search_games(
        &conn, "", "Game", &[], &[maxis], &[], &[], &[], &[],
        false, false, "title", "asc", 0, 100,
    )
    .unwrap();
    assert_eq!(result.total_count, 1);
    assert_eq!(result.games[0].title, "Sim City");
}

#[test]
fn test_filter_by_year() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "", "Game", &[], &[], &[], &[1993], &[], &[],
        false, false, "title", "asc", 0, 100,
    )
    .unwrap();
    assert_eq!(result.total_count, 1);
    assert_eq!(result.games[0].title, "Doom");
}

#[test]
fn test_filter_favorites_only() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "", "", &[], &[], &[], &[], &[], &[],
        true, false, "title", "asc", 0, 100,
    )
    .unwrap();
    assert_eq!(result.total_count, 1);
    assert_eq!(result.games[0].title, "Quake");
    assert!(result.games[0].favorite);
}

#[test]
fn test_sort_by_year_asc() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "", "Game", &[], &[], &[], &[], &[], &[],
        false, false, "year", "asc", 0, 100,
    )
    .unwrap();
    let years: Vec<i32> = result.games.iter().filter_map(|g| g.release_year).collect();
    assert_eq!(years, vec![1989, 1992, 1993, 1996]);
}

#[test]
fn test_sort_by_year_desc() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "", "Game", &[], &[], &[], &[], &[], &[],
        false, false, "year", "desc", 0, 100,
    )
    .unwrap();
    let years: Vec<i32> = result.games.iter().filter_map(|g| g.release_year).collect();
    assert_eq!(years, vec![1996, 1993, 1992, 1989]);
}

#[test]
fn test_sort_by_title_asc() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "", "Game", &[], &[], &[], &[], &[], &[],
        false, false, "title", "asc", 0, 100,
    )
    .unwrap();
    let titles: Vec<&str> = result.games.iter().map(|g| g.title.as_str()).collect();
    assert_eq!(titles, vec!["Doom", "Quake", "Sim City", "Wolfenstein 3D"]);
}

#[test]
fn test_sort_by_title_desc() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "", "Game", &[], &[], &[], &[], &[], &[],
        false, false, "title", "desc", 0, 100,
    )
    .unwrap();
    let titles: Vec<&str> = result.games.iter().map(|g| g.title.as_str()).collect();
    assert_eq!(titles, vec!["Wolfenstein 3D", "Sim City", "Quake", "Doom"]);
}

#[test]
fn test_sort_by_developer() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "", "Game", &[], &[], &[], &[], &[], &[],
        false, false, "developer", "asc", 0, 100,
    )
    .unwrap();
    // SQLite default ASC: uppercase 'M' (Maxis) sorts before lowercase 'i' (id Software)
    let devs: Vec<Option<&str>> = result.games.iter().map(|g| g.developer.as_deref()).collect();
    let maxis_pos = devs.iter().position(|d| *d == Some("Maxis")).unwrap();
    let id_soft_pos = devs.iter().position(|d| *d == Some("id Software")).unwrap();
    assert!(maxis_pos < id_soft_pos, "Maxis (M) should sort before id Software (i) in ASCII order");
}

#[test]
fn test_pagination() {
    let conn = make_db_with_games();
    let page1 = queries::search_games(
        &conn, "", "Game", &[], &[], &[], &[], &[], &[],
        false, false, "title", "asc", 0, 2,
    )
    .unwrap();
    let page2 = queries::search_games(
        &conn, "", "Game", &[], &[], &[], &[], &[], &[],
        false, false, "title", "asc", 2, 2,
    )
    .unwrap();
    assert_eq!(page1.games.len(), 2);
    assert_eq!(page2.games.len(), 2);
    assert_eq!(page1.total_count, 4);
    assert_ne!(page1.games[0].id, page2.games[0].id);
}

#[test]
fn test_toggle_favorite() {
    let conn = make_db_with_games();
    let id: i64 = conn
        .query_row("SELECT id FROM games WHERE title = 'Doom'", [], |r| r.get(0))
        .unwrap();

    let before: i32 = conn
        .query_row("SELECT favorite FROM games WHERE id = ?", [id], |r| r.get(0))
        .unwrap();
    assert_eq!(before, 0);

    conn.execute(
        "UPDATE games SET favorite = CASE WHEN favorite = 0 THEN 1 ELSE 0 END WHERE id = ?",
        [id],
    )
    .unwrap();
    let after: i32 = conn
        .query_row("SELECT favorite FROM games WHERE id = ?", [id], |r| r.get(0))
        .unwrap();
    assert_eq!(after, 1);

    conn.execute(
        "UPDATE games SET favorite = CASE WHEN favorite = 0 THEN 1 ELSE 0 END WHERE id = ?",
        [id],
    )
    .unwrap();
    let toggled_back: i32 = conn
        .query_row("SELECT favorite FROM games WHERE id = ?", [id], |r| r.get(0))
        .unwrap();
    assert_eq!(toggled_back, 0);
}

#[test]
fn test_get_filter_options() {
    let conn = make_db_with_games();
    // query="" (no FTS), content_type="Game"
    let opts = queries::get_filter_options(&conn, "", "Game", "", "", "", None, "", "", false).unwrap();
    assert!(opts.developers.contains(&"id Software".to_string()));
    assert!(opts.developers.contains(&"Maxis".to_string()));
    assert!(opts.years.contains(&1993));
    assert!(opts.years.contains(&1989));
    assert!(!opts.years.contains(&1994), "Magazine year should not appear in Game filter");
    assert!(opts.genres.contains(&"Action".to_string()));
    assert!(opts.genres.contains(&"Strategy".to_string()));
    // Content types always returned unfiltered
    assert!(opts.content_types.contains(&"Game".to_string()));
    assert!(opts.content_types.contains(&"Magazine".to_string()));
}

#[test]
fn test_filter_options_cascade_by_genre() {
    let conn = make_db_with_games();
    // When genre=Strategy is active, only Maxis should appear in developers
    let opts = queries::get_filter_options(&conn, "", "Game", "Strategy", "", "", None, "", "", false).unwrap();
    assert!(opts.developers.contains(&"Maxis".to_string()));
    assert!(!opts.developers.contains(&"id Software".to_string()));
    // Years should only include 1989 (Sim City)
    assert_eq!(opts.years, vec![1989]);
    // But genre list should still show all Game genres (excludes its own filter)
    assert!(opts.genres.contains(&"Action".to_string()));
    assert!(opts.genres.contains(&"Strategy".to_string()));
}

#[test]
fn test_filter_options_cascade_by_developer() {
    let conn = make_db_with_games();
    // When developer=Maxis, only Strategy genre should appear
    let opts = queries::get_filter_options(&conn, "", "Game", "", "Maxis", "", None, "", "", false).unwrap();
    assert!(opts.genres.contains(&"Strategy".to_string()));
    assert!(!opts.genres.contains(&"Action".to_string()));
    // Developer list still shows all options (excludes its own filter)
    assert!(opts.developers.contains(&"id Software".to_string()));
    assert!(opts.developers.contains(&"Maxis".to_string()));
}

// ── Multi-value genre/series fixture ─────────────────────────────────────────

fn make_db_with_multi_genre_series() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    schema::initialize(&conn).unwrap();
    conn.execute(
        "INSERT INTO collections (name, path) VALUES ('Test', 'C:\\Test')",
        [],
    )
    .unwrap();
    let cid: i64 = conn
        .query_row("SELECT id FROM collections", [], |r| r.get(0))
        .unwrap();

    // Game A: multiple genres and multiple series values
    conn.execute(
        "INSERT INTO games (collection_id, title, platform, developer, release_year, genre, series, application_path, content_type, favorite, title_normalized)
         VALUES (?1, 'Game A', 'MS-DOS', 'Dev1', 1991, 'Action; Adventure; Puzzle', 'King''s Quest; Space Quest', 'eXo\\!dos\\GameA\\GameA.bat', 'Game', 0, 'game a')",
        rusqlite::params![cid],
    )
    .unwrap();

    // Game B: two genres (one shared with A), one series value (shared with A)
    conn.execute(
        "INSERT INTO games (collection_id, title, platform, developer, release_year, genre, series, application_path, content_type, favorite, title_normalized)
         VALUES (?1, 'Game B', 'MS-DOS', 'Dev2', 1992, 'Adventure; Strategy', 'King''s Quest', 'eXo\\!dos\\GameB\\GameB.bat', 'Game', 0, 'game b')",
        rusqlite::params![cid],
    )
    .unwrap();

    // Game C: single genre and single series (no semicolons — baseline case)
    conn.execute(
        "INSERT INTO games (collection_id, title, platform, developer, release_year, genre, series, application_path, content_type, favorite, title_normalized)
         VALUES (?1, 'Game C', 'MS-DOS', 'Dev1', 1993, 'Strategy', 'Space Quest', 'eXo\\!dos\\GameC\\GameC.bat', 'Game', 0, 'game c')",
        rusqlite::params![cid],
    )
    .unwrap();

    let _ = conn.execute("INSERT INTO games_fts(games_fts) VALUES('rebuild')", []);
    conn
}

// ── Tests: get_distinct_values splits multi-value cells ──────────────────────

#[test]
fn test_filter_options_splits_multi_value_genres() {
    let conn = make_db_with_multi_genre_series();
    let opts = queries::get_filter_options(&conn, "", "Game", "", "", "", None, "", "", false).unwrap();

    // Individual split values must be present
    assert!(opts.genres.contains(&"Action".to_string()));
    assert!(opts.genres.contains(&"Adventure".to_string()));
    assert!(opts.genres.contains(&"Puzzle".to_string()));
    assert!(opts.genres.contains(&"Strategy".to_string()));

    // Raw compound strings must NOT be present
    assert!(!opts.genres.contains(&"Action; Adventure; Puzzle".to_string()));
    assert!(!opts.genres.contains(&"Adventure; Strategy".to_string()));

    // Deduplication: "Adventure" appears in Game A and Game B — only once in output
    assert_eq!(opts.genres.iter().filter(|g| g.as_str() == "Adventure").count(), 1);

    // Result is sorted alphabetically
    let mut sorted = opts.genres.clone();
    sorted.sort();
    assert_eq!(opts.genres, sorted);
}

#[test]
fn test_filter_options_splits_multi_value_series() {
    let conn = make_db_with_multi_genre_series();
    let opts = queries::get_filter_options(&conn, "", "Game", "", "", "", None, "", "", false).unwrap();

    // Individual split values must be present
    assert!(opts.series.contains(&"King's Quest".to_string()));
    assert!(opts.series.contains(&"Space Quest".to_string()));

    // Raw compound string must NOT be present
    assert!(!opts.series.contains(&"King's Quest; Space Quest".to_string()));

    // Deduplication: "King's Quest" appears in Game A and Game B — only once
    assert_eq!(opts.series.iter().filter(|s| s.as_str() == "King's Quest").count(), 1);
}

// ── Tests: search_games LIKE filtering on multi-value cells ──────────────────

#[test]
fn test_search_genre_filter_matches_multi_value_cells() {
    let conn = make_db_with_multi_genre_series();

    // "Action" only appears in Game A ("Action; Adventure; Puzzle")
    let r = queries::search_games(
        &conn, "", "Game", &["Action".to_string()], &[], &[], &[], &[], &[],
        false, false, "title", "asc", 0, 100,
    ).unwrap();
    assert_eq!(r.total_count, 1);
    assert_eq!(r.games[0].title, "Game A");

    // "Adventure" appears in Game A and Game B
    let r2 = queries::search_games(
        &conn, "", "Game", &["Adventure".to_string()], &[], &[], &[], &[], &[],
        false, false, "title", "asc", 0, 100,
    ).unwrap();
    assert_eq!(r2.total_count, 2);

    // "Strategy" appears in Game B ("Adventure; Strategy") and Game C ("Strategy")
    let r3 = queries::search_games(
        &conn, "", "Game", &["Strategy".to_string()], &[], &[], &[], &[], &[],
        false, false, "title", "asc", 0, 100,
    ).unwrap();
    assert_eq!(r3.total_count, 2);
}

#[test]
fn test_search_series_filter_matches_multi_value_cells() {
    let conn = make_db_with_multi_genre_series();

    // "King's Quest" appears in Game A ("King's Quest; Space Quest") and Game B
    let r = queries::search_games(
        &conn, "", "Game", &[], &[], &[], &[], &["King's Quest".to_string()], &[],
        false, false, "title", "asc", 0, 100,
    ).unwrap();
    assert_eq!(r.total_count, 2);
    let titles: Vec<&str> = r.games.iter().map(|g| g.title.as_str()).collect();
    assert!(titles.contains(&"Game A"));
    assert!(titles.contains(&"Game B"));

    // "Space Quest" appears in Game A ("King's Quest; Space Quest") and Game C
    let r2 = queries::search_games(
        &conn, "", "Game", &[], &[], &[], &[], &["Space Quest".to_string()], &[],
        false, false, "title", "asc", 0, 100,
    ).unwrap();
    assert_eq!(r2.total_count, 2);
    let titles2: Vec<&str> = r2.games.iter().map(|g| g.title.as_str()).collect();
    assert!(titles2.contains(&"Game A"));
    assert!(titles2.contains(&"Game C"));
}

#[test]
fn test_filter_options_cascade_with_multi_value_genre() {
    let conn = make_db_with_multi_genre_series();

    // Filtering by "Action" (Game A only) — series options should only include
    // Game A's series values: "King's Quest" and "Space Quest"
    let opts = queries::get_filter_options(&conn, "", "Game", "Action", "", "", None, "", "", false).unwrap();
    assert!(opts.series.contains(&"King's Quest".to_string()));
    assert!(opts.series.contains(&"Space Quest".to_string()));
    // Game B's unique-to-B series "King's Quest" is shared, but Dev2 should not appear
    assert!(!opts.developers.contains(&"Dev2".to_string()));
    assert!(opts.developers.contains(&"Dev1".to_string()));
}
