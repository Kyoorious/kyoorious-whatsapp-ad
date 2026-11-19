CREATE TABLE IF NOT EXISTS messages (
  wamid TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  sent_ts INTEGER
);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone);

CREATE TABLE IF NOT EXISTS statuses (
  wamid TEXT NOT NULL,
  status TEXT NOT NULL,
  ts INTEGER,
  error_code TEXT,
  error TEXT,
  category TEXT,
  billable INTEGER,
  PRIMARY KEY (wamid, status)
);

CREATE TABLE IF NOT EXISTS chat (
  media_id TEXT, mime TEXT, filename TEXT, react_in TEXT, react_out TEXT, auto_flag INTEGER DEFAULT 0,
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wamid TEXT UNIQUE,
  phone TEXT NOT NULL,
  direction TEXT NOT NULL,   -- in | out
  sender TEXT NOT NULL,      -- customer | ai | human
  body TEXT,
  ts INTEGER NOT NULL,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_chat_phone ON chat(phone, ts);

CREATE TABLE IF NOT EXISTS convo (
  phone TEXT PRIMARY KEY,
  name TEXT,
  last_in_ts INTEGER,
  ai_enabled INTEGER NOT NULL DEFAULT 1,
  needs_human INTEGER NOT NULL DEFAULT 0,
  opted_out INTEGER NOT NULL DEFAULT 0,
  last_auto_ts INTEGER
);

CREATE TABLE IF NOT EXISTS contacts (
  phone TEXT PRIMARY KEY,
  name TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS queue (
  phone TEXT PRIMARY KEY,
  name TEXT,
  city TEXT,
  pos INTEGER,
  claimed_ts INTEGER
);
CREATE INDEX IF NOT EXISTS idx_queue_pos ON queue(pos);
-- messages.source: queue | manual (added via ALTER TABLE)
