-- Extends restaurants/orders to support the Customer app's existing UI contract:
-- restaurant browsing (cuisine/rating/photo/open-until) and parcel-type orders + ratings.

ALTER TABLE restaurants
  ADD COLUMN cuisine VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN rating DECIMAL(2, 1) NOT NULL DEFAULT 0,
  ADD COLUMN photo_url VARCHAR(255) NULL,
  ADD COLUMN open_until VARCHAR(20) NULL;

ALTER TABLE orders
  ADD COLUMN type ENUM('FOOD', 'PARCEL') NOT NULL DEFAULT 'FOOD',
  ADD COLUMN pickup_address VARCHAR(255) NULL,
  ADD COLUMN pickup_latitude DECIMAL(10, 7) NULL,
  ADD COLUMN pickup_longitude DECIMAL(10, 7) NULL,
  ADD COLUMN parcel_size ENUM('S', 'M', 'L') NULL,
  ADD COLUMN note VARCHAR(255) NULL,
  ADD COLUMN rating_stars TINYINT NULL,
  ADD COLUMN rating_comment VARCHAR(500) NULL,
  MODIFY restaurant_id INT NULL;
