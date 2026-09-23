import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';

interface MenuItemRow extends RowDataPacket {
  item_id: number;
  name: string;
  description: string | null;
  price: number;
}

export const menuService = {
  async listByRestaurant(restaurantId: number) {
    const [rows] = await pool.query<MenuItemRow[]>(
      `SELECT item_id, name, description, price FROM menu_items
       WHERE restaurant_id = ? AND status = 'available' ORDER BY item_id ASC`,
      [restaurantId]
    );
    return rows.map((row) => ({
      id: row.item_id,
      name: row.name,
      description: row.description ?? '',
      price: Number(row.price),
    }));
  },
};
