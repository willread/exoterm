use rusqlite::Connection;

pub fn initialize(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS collections (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            path        TEXT NOT NULL UNIQUE,
            last_scanned INTEGER
        );

        CREATE TABLE IF NOT EXISTS games (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id    INTEGER NOT NULL REFERENCES collections(id),
            title            TEXT NOT NULL,
            sort_title       TEXT,
            platform         TEXT NOT NULL DEFAULT '',
            developer        TEXT,
            publisher        TEXT,
            release_year     INTEGER,
            genre            TEXT,
            series           TEXT,
            max_players      TEXT,
            play_mode        TEXT,
            overview         TEXT,
            application_path TEXT NOT NULL,
            root_folder      TEXT,
            source           TEXT,
            favorite         INTEGER NOT NULL DEFAULT 0,
            content_type     TEXT NOT NULL DEFAULT 'Game',
            lb_id            TEXT,
            lb_database_id   TEXT,
            title_normalized TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_games_title_norm ON games(title_normalized);
        CREATE INDEX IF NOT EXISTS idx_games_collection ON games(collection_id);
        CREATE INDEX IF NOT EXISTS idx_games_genre ON games(genre);
        CREATE INDEX IF NOT EXISTS idx_games_developer ON games(developer);
        CREATE INDEX IF NOT EXISTS idx_games_publisher ON games(publisher);
        CREATE INDEX IF NOT EXISTS idx_games_year ON games(release_year);
        CREATE INDEX IF NOT EXISTS idx_games_series ON games(series);
        CREATE INDEX IF NOT EXISTS idx_games_favorite ON games(favorite);
        CREATE INDEX IF NOT EXISTS idx_games_content_type ON games(content_type);
        CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform);
        ",
    )?;

    // Create FTS5 table if it doesn't exist
    // We check by attempting the create and ignoring the error if it exists
    let _ = conn.execute_batch(
        "
        CREATE VIRTUAL TABLE IF NOT EXISTS games_fts USING fts5(
            title, developer, publisher, genre,
            content='games', content_rowid='id'
        );

        CREATE TRIGGER IF NOT EXISTS games_ai AFTER INSERT ON games BEGIN
            INSERT INTO games_fts(rowid, title, developer, publisher, genre)
            VALUES (new.id, new.title, new.developer, new.publisher, new.genre);
        END;

        CREATE TRIGGER IF NOT EXISTS games_ad AFTER DELETE ON games BEGIN
            INSERT INTO games_fts(games_fts, rowid, title, developer, publisher, genre)
            VALUES ('delete', old.id, old.title, old.developer, old.publisher, old.genre);
        END;

        CREATE TRIGGER IF NOT EXISTS games_au AFTER UPDATE ON games BEGIN
            INSERT INTO games_fts(games_fts, rowid, title, developer, publisher, genre)
            VALUES ('delete', old.id, old.title, old.developer, old.publisher, old.genre);
            INSERT INTO games_fts(rowid, title, developer, publisher, genre)
            VALUES (new.id, new.title, new.developer, new.publisher, new.genre);
        END;
        ",
    );

    Ok(())
}
