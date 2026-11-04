-- Initialize a NEW independent database; preserve the legacy database backup.
CREATE TABLE IF NOT EXISTS pages (slug TEXT NOT NULL, language TEXT NOT NULL CHECK(language IN ('zh','en','es')), content TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(slug,language));
CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, name TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, company TEXT, message TEXT NOT NULL, business_type TEXT NOT NULL, language TEXT NOT NULL, source_page TEXT, utm TEXT, consent INTEGER NOT NULL, crm_status TEXT NOT NULL DEFAULT 'pending', email_status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS limits_expiry ON limits(expires);
