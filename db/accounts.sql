CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL CHECK(length(username) <= 12),
    password TEXT NOT NULL CHECK(length(password) <= 12),
    salt TEXT NOT NULL,
    hash TEXT NOT NULL,
    shape TEXT NOT NULL CHECK (shape IN ('cube', 'sphere', 'cone')),
    color TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO accounts (username, password, salt, hash, shape, color) VALUES ('clay', 'foobar', '$2b$10$Tpc0EjrF2TegTwUUB7MP5e', '$2b$10$Tpc0EjrF2TegTwUUB7MP5eSHZ4M/Knq3FrMDRzpyhiTdpDe5jS8Y2', 'cone', '#9141ac');
INSERT INTO accounts (username, password, salt, hash, shape, color) VALUES ('parsa', 'foobar', '$2b$10$NjYK7EhH7jCqRE.rd/TGk.', '$2b$10$NjYK7EhH7jCqRE.rd/TGk.IPN6Va2bshvhzKpZ7KommM7yN2JaK5a', 'sphere', '#8488ac');