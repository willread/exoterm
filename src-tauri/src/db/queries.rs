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
    has_extras: bool,
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

    if has_extras {
        where_clauses.push(
            "EXISTS (SELECT 1 FROM game_extras WHERE game_id = g.id)".to_string(),
        );
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

    // Validate sort column.
    // Use COALESCE for title so that rows with a NULL title_normalized (old data)
    // fall back to lower(title) and still sort correctly.
    let sort_col = match sort_by {
        "title" => "COALESCE(g.title_normalized, lower(g.title))",
        "year" => "g.release_year",
        "developer" => "g.developer",
        "publisher" => "g.publisher",
        "genre" => "g.genre",
        "platform" => "g.platform",
        _ => "COALESCE(g.title_normalized, lower(g.title))",
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

/// Build a WHERE clause from all active filters, optionally excluding one category
/// so that category's options aren't limited by its own selection.
fn build_option_filter(
    content_type: &str,
    genre: &str,
    developer: &str,
    publisher: &str,
    year: Option<i32>,
    series: &str,
    platform: &str,
    favorites_only: bool,
    exclude: &str,
) -> String {
    let mut clauses: Vec<String> = Vec::new();

    if !content_type.is_empty() && exclude != "content_type" {
        clauses.push(format!(
            "content_type = '{}'",
            content_type.replace('\'', "''")
        ));
    }
    if !genre.is_empty() && exclude != "genre" {
        clauses.push(format!("genre LIKE '%{}%'", genre.replace('\'', "''")));
    }
    if !developer.is_empty() && exclude != "developer" {
        clauses.push(format!(
            "developer = '{}'",
            developer.replace('\'', "''")
        ));
    }
    if !publisher.is_empty() && exclude != "publisher" {
        clauses.push(format!(
            "publisher = '{}'",
            publisher.replace('\'', "''")
        ));
    }
    if let Some(y) = year {
        if exclude != "year" {
            clauses.push(format!("release_year = {}", y));
        }
    }
    if !series.is_empty() && exclude != "series" {
        clauses.push(format!("series = '{}'", series.replace('\'', "''")));
    }
    if !platform.is_empty() && exclude != "platform" {
        clauses.push(format!(
            "platform = '{}'",
            platform.replace('\'', "''")
        ));
    }
    if favorites_only {
        clauses.push("favorite = 1".to_string());
    }

    if clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", clauses.join(" AND "))
    }
}

/// Fetch distinct values for a column, filtered by a WHERE clause.
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

/// Return available filter options. Each category is filtered by all OTHER active
/// filters so the user sees only values that would produce results.
/// Content types are always unfiltered so the user can always switch category.
pub fn get_filter_options(
    conn: &Connection,
    content_type: &str,
    genre: &str,
    developer: &str,
    publisher: &str,
    year: Option<i32>,
    series: &str,
    platform: &str,
    favorites_only: bool,
) -> rusqlite::Result<FilterOptions> {
    // Content types: always show all available (unfiltered)
    let content_types = get_distinct_values(conn, "content_type", "")?;

    // Each category excludes itself so you can still switch within that category
    let genre_where = build_option_filter(
        content_type, genre, developer, publisher, year, series, platform, favorites_only, "genre",
    );
    let dev_where = build_option_filter(
        content_type, genre, developer, publisher, year, series, platform, favorites_only, "developer",
    );
    let pub_where = build_option_filter(
        content_type, genre, developer, publisher, year, series, platform, favorites_only, "publisher",
    );
    let year_where = build_option_filter(
        content_type, genre, developer, publisher, year, series, platform, favorites_only, "year",
    );
    let series_where = build_option_filter(
        content_type, genre, developer, publisher, year, series, platform, favorites_only, "series",
    );
    let platform_where = build_option_filter(
        content_type, genre, developer, publisher, year, series, platform, favorites_only, "platform",
    );

    let genres = get_distinct_values(conn, "genre", &genre_where)?;
    let developers = get_distinct_values(conn, "developer", &dev_where)?;
    let publishers = get_distinct_values(conn, "publisher", &pub_where)?;
    let series_vals = get_distinct_values(conn, "series", &series_where)?;
    let platforms = get_distinct_values(conn, "platform", &platform_where)?;

    // Years need special handling (integer column)
    let year_sql = if year_where.is_empty() {
        "SELECT DISTINCT release_year FROM games WHERE release_year IS NOT NULL ORDER BY release_year"
            .to_string()
    } else {
        format!(
            "SELECT DISTINCT release_year FROM games {} AND release_year IS NOT NULL ORDER BY release_year",
            year_where
        )
    };
    let mut year_stmt = conn.prepare(&year_sql)?;
    let years: Vec<i32> = year_stmt
        .query_map([], |row| row.get::<_, i32>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(FilterOptions {
        content_types,
        genres,
        developers,
        publishers,
        years,
        series: series_vals,
        platforms,
    })
}
