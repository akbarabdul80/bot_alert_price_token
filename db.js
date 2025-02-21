db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER,
        chain_id INTEGER,
        address TEXT,
        token_name TEXT,
        target_price REAL,
        alert_sent INTEGER DEFAULT 0
    )
`);
