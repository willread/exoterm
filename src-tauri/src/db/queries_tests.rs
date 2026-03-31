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
        false, "title", "asc", 0, 100,
    )
    .unwrap();
    assert_eq!(result.total_count, 4);
}

#[test]
fn test_search_filters_by_content_type_magazine() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "", "Magazine", &[], &[], &[], &[], &[], &[],
        false, "title", "asc", 0, 100,
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
        false, "title", "asc", 0, 100,
    )
    .unwrap();
    assert_eq!(result.total_count, 5);
}

#[test]
fn test_search_by_fts_query() {
    let conn = make_db_with_games();
    let result = queries::search_games(
        &conn, "doom", "Game", &[], &[], &[], &[], &[], &[],
        false, "title", "asc", 0, 100,
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
        false, "title", "asc", 0, 100,
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
        false, "title", "asc", 0, 100,
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
        false, "title", "asc", 0, 100,
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
        true, "title", "asc", 0, 100,
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
        false, "year", "asc", 0, 100,
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
        false, "year", "desc", 0, 100,
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
        false, "title", "asc", 0, 100,
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
        false, "title", "desc", 0, 100,
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
        false, "developer", "asc", 0, 100,
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
        false, "title", "asc", 0, 2,
    )
    .unwrap();
    let page2 = queries::search_games(
        &conn, "", "Game", &[], &[], &[], &[], &[], &[],
        false, "title", "asc", 2, 2,
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
    let opts = queries::get_filter_options(&conn, "Game").unwrap();
    assert!(opts.developers.contains(&"id Software".to_string()));
    assert!(opts.developers.contains(&"Maxis".to_string()));
    assert!(opts.years.contains(&1993));
    assert!(opts.years.contains(&1989));
    assert!(!opts.years.contains(&1994), "Magazine year should not appear in Game filter");
    assert!(opts.genres.contains(&"Action".to_string()));
    assert!(opts.genres.contains(&"Strategy".to_string()));
}
