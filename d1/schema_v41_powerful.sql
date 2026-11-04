
CREATE TABLE IF NOT EXISTS phone_numbers (
  number TEXT PRIMARY KEY,
  price INTEGER,
  monthly_fee INTEGER DEFAULT 500,
  description TEXT,
  subdomain TEXT,
  image TEXT,
  status TEXT DEFAULT 'available',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR REPLACE INTO phone_numbers (number, price, monthly_fee, description, subdomain, status) VALUES
('2135551234', 1500, 500, '洛杉矶靓号', '2135551234.buy.spanler.com', 'available'),
('6263218888', 19900, 800, 'El Monte 8888豹子号', '6263218888.buy.spanler.com', 'available'),
('9498880001', 2900, 1000, 'Irvine 888开头', '9498880001.buy.spanler.com', 'available');

CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR REPLACE INTO site_config (key, value) VALUES
('title', 'Spanler.com V4.1 - 美国华人生活门户 Marketplace'),
('logo', 'Spanler.com V4.1'),
('copyright', '© 2026 Spanler.com 美国华人生活门户 | El Monte, CA | V4.1 A+B 主站优先版'),
('email', 'contact@spanler.com'),
('phone', '626-321-8888'),
('address', 'El Monte, CA 91731'),
('notice', '主站7大板块：云电话 / 黄页 / 生活服务 / 租房 / 招聘 / 二手 / 汽车。AI SDR真Groq Llama已接通，D1真数据库，R2真存储。');

CREATE TABLE IF NOT EXISTS media_files (
  name TEXT PRIMARY KEY,
  url TEXT,
  type TEXT,
  size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  title TEXT,
  category TEXT,
  price TEXT,
  description TEXT,
  images TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR REPLACE INTO listings (id, title, category, price, description) VALUES
('1', '【求租】El Monte 2B1B $1800 包水电', '租房', '1800', 'El Monte 2B1B 拎包入住'),
('2', '【招聘】Irvine奶茶店招人 $18/h', '招聘', '18', 'Irvine奶茶店招人'),
('3', '【二手】二手丰田Camry 2019 $12000', '二手', '12000', '二手丰田');

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  phone TEXT,
  image TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR REPLACE INTO businesses (id, name, category, phone) VALUES
('1', '川菜馆 El Monte', '餐饮', '626-xxx'),
('2', '装修队 LA', '装修', '213-xxx'),
('3', '华人律师', '律师', '咨询'),
('4', '会计报税', '会计', 'Irvine');
