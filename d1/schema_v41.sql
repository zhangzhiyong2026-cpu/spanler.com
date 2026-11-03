
CREATE TABLE IF NOT EXISTS phone_numbers (
  id TEXT PRIMARY KEY,
  number TEXT UNIQUE,
  country TEXT DEFAULT 'US',
  type TEXT DEFAULT 'voip',
  price INTEGER,
  monthly_fee INTEGER,
  status TEXT DEFAULT 'available',
  subdomain TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO phone_numbers (id, number, price, monthly_fee, subdomain, status) VALUES
('1','2135551234',1500,500,'2135551234.buy.spanler.com','available'),
('2','6263218888',19900,800,'6263218888.buy.spanler.com','available'),
('3','9498880001',2900,1000,'9498880001.buy.spanler.com','available');

CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY, title TEXT, category_slug TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS businesses (id TEXT PRIMARY KEY, name TEXT, status TEXT);
