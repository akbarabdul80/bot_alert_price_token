db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER,
        chain_id INTEGER,
        address TEXT,
        token_name TEXT,
        target_price_gte REAL,
        target_price_lte REAL,
        alert_sent INTEGER DEFAULT 0
    )
`);
