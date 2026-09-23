-- Demo data so GET /restaurants has something to browse during development.
INSERT INTO restaurants (name, address, latitude, longitude, status, cuisine, rating, open_until)
VALUES
  ('ครัวบ้านสวน', 'ซอยอารีย์ 4', 13.7797, 100.5445, 'active', 'อาหารไทย', 4.6, '21:00'),
  ('ก๋วยเตี๋ยวเรือป้าแดง', 'ตลาดอมรพันธ์', 13.7900, 100.5500, 'active', 'ก๋วยเตี๋ยว', 4.4, '20:00'),
  ('Wash&Go Kitchen', 'ซอยลาดพร้าว 15', 13.8000, 100.5700, 'active', 'ฟิวชัน', 4.1, '22:00')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO menu_items (restaurant_id, name, description, price, status)
SELECT restaurant_id, 'ข้าวผัดกะเพราหมูสับ', 'เผ็ดกลาง ใส่ไข่ดาว', 60, 'available' FROM restaurants WHERE name = 'ครัวบ้านสวน'
UNION ALL
SELECT restaurant_id, 'ไข่ดาว', 'ไข่ดาวเสริม', 10, 'available' FROM restaurants WHERE name = 'ครัวบ้านสวน'
UNION ALL
SELECT restaurant_id, 'ก๋วยเตี๋ยวเรือหมู', 'น้ำตกหมู', 35, 'available' FROM restaurants WHERE name = 'ก๋วยเตี๋ยวเรือป้าแดง'
UNION ALL
SELECT restaurant_id, 'ลูกชิ้นเพิ่ม', 'ลูกชิ้นหมู 4 ลูก', 15, 'available' FROM restaurants WHERE name = 'ก๋วยเตี๋ยวเรือป้าแดง';
