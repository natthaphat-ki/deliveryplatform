import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { ApiError } from '../utils/apiError';
import { distanceKm, etaMinutesFor } from '../utils/geo';

interface RestaurantRow extends RowDataPacket {
  restaurant_id: number;
  name: string;
  cuisine: string;
  rating: number;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  status: 'active' | 'inactive';
  open_until: string | null;
}

// Wire shape matches FontEnd/User/lib/models/restaurant.dart's Restaurant.fromJson (snake_case).
function toRestaurantJson(row: RestaurantRow, lat: number, lng: number) {
  const distance = distanceKm(lat, lng, Number(row.latitude), Number(row.longitude));
  return {
    id: row.restaurant_id,
    name: row.name,
    cuisine: row.cuisine,
    rating: Number(row.rating),
    distance_km: Math.round(distance * 10) / 10,
    eta_minutes: etaMinutesFor(distance),
    photo_url: row.photo_url,
    is_open: row.status === 'active',
    open_until: row.open_until,
  };
}

export const restaurantService = {
  async list({ lat, lng }: { lat: number; lng: number }) {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new ApiError(400, 'lat must be a number between -90 and 90');
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new ApiError(400, 'lng must be a number between -180 and 180');
    }

    const [rows] = await pool.query<RestaurantRow[]>(
      `SELECT restaurant_id, name, cuisine, rating, latitude, longitude, photo_url, status, open_until
       FROM restaurants WHERE status = 'active' ORDER BY restaurant_id ASC`
    );
    return rows
      .map((row) => toRestaurantJson(row, lat, lng))
      .sort((a, b) => a.distance_km - b.distance_km);
  },

  async findById(id: number) {
    const [rows] = await pool.query<RestaurantRow[]>(
      `SELECT restaurant_id, name, cuisine, rating, latitude, longitude, photo_url, status, open_until
       FROM restaurants WHERE restaurant_id = ?`,
      [id]
    );
    const row = rows[0];
    if (!row) {
      throw new ApiError(404, 'Restaurant not found');
    }
    return toRestaurantJson(row, Number(row.latitude), Number(row.longitude));
  },
};
