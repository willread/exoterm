use rusqlite::{params, Connection};

use crate::models::{FilterOptions, Game, GameSummary, SearchResult};

pub fn search_games(
    conn: &Connection,
    query: &str,
    content_type: &str,
    genres: &[String],
    developers: &[String],
    publishers: &[String],
    years: &[i32],
    series: &[String],
    platforms: &[String],
    favorites_only: bool,
    sort_by: &str,
    sort_dir: &str,
    offset: i64,
    limit: i64,
) -> rusqlite::Result<SearchResult> {
    let mut where_clauses: Vec<String> = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let use_fts = !query.is_empty();

    if use_fts {
        // Escape special FTS5 characters and add prefix matching
        let escaped = query.replace('"', "\"\"");
        where_clauses.push("games_fts MATCH ?".to_string());
        params_vec.push(Box::new(format!("\"{}\"*", escaped)));
    }

    if !content_type.is_empty() {
        where_clauses.push("g.content_type = ?".to_string());
        params_vec.push(Box::new(content_type.to_string()));
    }

    if !genres.is_empty() {
        let clauses: Vec<String> = genres.iter().map(|_| "g.genre LIKE ?".to_string()).collect();
        where_clauses.push(format!("({})", clauses.join(" OR ")));
        for g in genres {
            params_vec.push(Box::new(format!("%{}%", g)));
        }
    }

    if !developers.is_empty() {
        if developers.len() == 1 {
            where_clauses.push("g.developer = ?".to_string());
            params_vec.push(Box::new(developers[0].clone()));
        } else {
            let placeholders = developers.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
            where_clauses.push(format!("g.developer IN ({})", placeholders));
            for d in developers {
                params_vec.push(Box::new(d.clone()));
            }
        }
    }

    if !publishers.is_empty() {
        if publishers.len() == 1 {
            where_clauses.push("g.publisher = ?".to_string());
            params_vec.push(Box::new(publishers[0].clone()));
        } else {
            let placeholders = publishers.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
            where_clauses.push(format!("g.publisher IN ({})", placeholders));
            for p in publishers {
                params_vec.push(Box::new(p.clone()));
            }
        }
    }

    if !years.is_empty() {
        if years.len() == 1 {
            where_clauses.push("g.release_year = ?".to_string());
            params_vec.push(Box::new(years[0]));
        } else {
            let placeholders = years.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
            where_clauses.push(format!("g.release_year IN ({})", placeholders));
            for y in years {
                params_vec.push(Box::new(*y));
            }
        }
    }

    if !series.is_empty() {
        if series.len() == 1 {
            where_clauses.push("g.series = ?".to_string());
            params_vec.push(Box::new(series[0].clone()));
        } else {
            let placeholders = series.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
            where_clauses.push(format!("g.series IN ({})", placeholders));
            for s in series {
                params_vec.push(Box::new(s.clone()));
            }
        }
    }

    if !platforms.is_empty() {
        if platforms.len() == 1 {
            where_clauses.push("g.platform = ?".to_string());
            params_vec.push(Box::new(platforms[0].clone()));
        } else {
            let placeholders = platforms.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
            where_clauses.push(format!("g.platform IN ({})", placeholders));
            for p in platforms {
                params_vec.push(Box::new(p.clone()));
            }
        }
    }

    if favorites_only {
        where_clauses.push("g.favorite = 1".to_string());
    }

    let where_str = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    let join_str = if use_fts {
        "JOIN games_fts ON g.id = games_fts.rowid"
    } else {
        ""
    };

    // Validate sort column
    let sort_col = match sort_by {
        "title" => "g.title_normalized",
        "year" => "g.release_year",
        "developer" => "g.developer",
        "publisher" => "g.publisher",
        "genre" => "g.genre",
        "platform" => "g.platform",
        _ => "g.title_normalized",
    };

    let dir = if sort_dir == "desc" { "DESC" } else { "ASC" };

    // Count query
    let count_sql = format!(
        "SELECT COUNT(*) FROM games g {} {}",
        join_str, where_str
    );

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|p| p.as_ref()).collect();

    let total_count: i64 = conn.query_row(&count_sql, params_refs.as_slice(), |row| {
        row.get(0)
    })?;

    // Data query
    let data_sql = format!(
        "SELECT g.id, g.title, g.release_year, g.developer, g.publisher, g.genre, g.platform, g.favorite, g.content_type
         FROM games g {} {}
         ORDER BY {} {} NULLS LAST
         LIMIT ? OFFSET ?",
        join_str, where_str, sort_col, dir
    );

    let mut all_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    for p in params_vec {
        all_params.push(p);
    }
    all_params.push(Box::new(limit));
    all_params.push(Box::new(offset));

    let all_refs: Vec<&dyn rusqlite::types::ToSql> =
        all_params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&data_sql)?;
    let games = stmt
        .query_map(all_refs.as_slice(), |row| {
            Ok(GameSummary {
                id: row.get(0)?,
                title: row.get(1)?,
                release_year: row.get(2)?,
                developer: row.get(3)?,
                publisher: row.get(4)?,
                genre: row.get(5)?,
                platform: row.get(6)?,
                favorite: row.get::<_, i32>(7)? != 0,
                content_type: row.get(8)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(SearchResult { games, total_count })
}

pub fn get_game(conn: &Connection, id: i64) -> rusqlite::Result<Game> {
    conn.query_row(
        "SELECT id, collection_id, title, sort_title, platform, developer, publisher,
                release_year, genre, series, max_players, play_mode, overview,
                application_path, root_folder, source, favorite, content_type,
                lb_id, lb_database_id
         FROM games WHERE id = ?",
        params![id],
        |row| {
            Ok(Game {
                id: row.get(0)?,
                collection_id: row.get(1)?,
                title: row.get(2)?,
                sort_title: row.get(3)?,
                platform: row.get(4)?,
                developer: row.get(5)?,
                publisher: row.get(6)?,
                release_year: row.get(7)?,
                genre: row.get(8)?,
                series: row.get(9)?,
                max_players: row.get(10)?,
                play_mode: row.get(11)?,
                overview: row.get(12)?,
                application_path: row.get(13)?,
                root_folder: row.get(14)?,
                source: row.get(15)?,
                favorite: row.get::<_, i32>(16)? != 0,
                content_type: row.get(17)?,
                lb_id: row.get(18)?,
                lb_database_id: row.get(19)?,
            })
        },
    )
}

pub fn get_filter_options(conn: &Connection, content_type: &str) -> rusqlite::Result<FilterOptions> {
    let ct_clause = if content_type.is_empty() {
        String::new()
    } else {
        format!("WHERE content_type = '{}'", content_type.replace('\'', "''"))
    };

    let genres = get_distinct_values(conn, "genre", &ct_clause)?;
    let developers = get_distinct_values(conn, "developer", &ct_clause)?;
    let publishers = get_distinct_values(conn, "publisher", &ct_clause)?;
    let series = get_distinct_values(conn, "series", &ct_clause)?;
    let platforms = get_distinct_values(conn, "platform", &ct_clause)?;

    let year_sql = if ct_clause.is_empty() {
        "SELECT DISTINCT release_year FROM games WHERE release_year IS NOT NULL ORDER BY release_year".to_string()
    } else {
        format!(
            "SELECT DISTINCT release_year FROM games {} AND release_year IS NOT NULL ORDER BY release_year",
            ct_clause
        )
    };
    let mut year_stmt = conn.prepare(&year_sql)?;
    let years: Vec<i32> = year_stmt
        .query_map([], |row| row.get::<_, i32>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(FilterOptions {
        genres,
        developers,
        publishers,
        years,
        series,
        platforms,
    })
}

fn get_distinct_values(
    conn: &Connection,
    column: &str,
    where_clause: &str,
) -> rusqlite::Result<Vec<String>> {
    let sql = if where_clause.is_empty() {
        format!(
            "SELECT DISTINCT {} FROM games WHERE {} IS NOT NULL AND {} != '' ORDER BY {}",
            column, column, column, column
        )
    } else {
        format!(
            "SELECT DISTINCT {} FROM games {} AND {} IS NOT NULL AND {} != '' ORDER BY {}",
            column, where_clause, column, column, column
        )
    };
    let mut stmt = conn.prepare(&sql)?;
    let values = stmt
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(values)
}
