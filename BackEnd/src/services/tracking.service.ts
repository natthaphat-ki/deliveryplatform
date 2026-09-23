import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { ApiError } from '../utils/apiError';
import { OrderStatus } from '../types/order';
import { Role } from '../types/roles';
import { broadcastToOrder } from '../sockets/tracking.socket';

export interface LocationPing {
  userId: number;
  orderId: number;
  latitude: number;
  longitude: number;
}

interface LocationRow extends RowDataPacket {
  latitude: number;
  longitude: number;
  recorded_at: Date;
}

// Locations are only accepted while the rider is actually on the job.
const TRACKABLE_STATUSES: OrderStatus[] = ['PICKING_UP', 'ON_THE_WAY'];

function assertCoordinates(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new ApiError(400, 'latitude must be a number between -90 and 90');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new ApiError(400, 'longitude must be a number between -180 and 180');
  }
}

function toLocation(row: LocationRow) {
  return { latitude: Number(row.latitude), longitude: Number(row.longitude), recordedAt: row.recorded_at };
}

export const trackingService = {
  /** Latest rider position for an order, or null when none has been recorded yet. */
  async latestLocation(orderId: number) {
    const [rows] = await pool.query<LocationRow[]>(
      `SELECT latitude, longitude, recorded_at FROM delivery_locations
       WHERE order_id = ? ORDER BY recorded_at DESC, location_id DESC LIMIT 1`,
      [orderId]
    );
    return rows[0] ? toLocation(rows[0]) : null;
  },

  async getLastLocation(orderId: number, requester: { userId: number; role: Role }) {
    const [orders] = await pool.query<(RowDataPacket & { customer_id: number })[]>(
      'SELECT customer_id FROM orders WHERE order_id = ?',
      [orderId]
    );
    if (!orders[0]) {
      throw new ApiError(404, 'Order not found');
    }
    if (requester.role === 'customer' && orders[0].customer_id !== requester.userId) {
      throw new ApiError(403, 'You do not have access to this order');
    }
    return trackingService.latestLocation(orderId);
  },

  /** Stores a GPS ping from the rider assigned to the order and pushes it to WebSocket subscribers. */
  async recordLocation(ping: LocationPing) {
    if (!Number.isInteger(ping.orderId) || ping.orderId <= 0) {
      throw new ApiError(400, 'orderId must be a positive integer');
    }
    assertCoordinates(ping.latitude, ping.longitude);

    const [orders] = await pool.query<(RowDataPacket & { delivery_id: number; status: OrderStatus })[]>(
      `SELECT o.delivery_id, o.status FROM orders o
       JOIN delivery_profiles dp ON dp.delivery_id = o.delivery_id
       WHERE o.order_id = ? AND dp.user_id = ?`,
      [ping.orderId, ping.userId]
    );
    const order = orders[0];
    if (!order) {
      throw new ApiError(404, 'Assigned delivery job not found');
    }
    if (!TRACKABLE_STATUSES.includes(order.status)) {
      throw new ApiError(409, `Location can't be recorded while the order is ${order.status}`);
    }

    await pool.execute<ResultSetHeader>(
      'INSERT INTO delivery_locations (delivery_id, order_id, latitude, longitude) VALUES (?, ?, ?, ?)',
      [order.delivery_id, ping.orderId, ping.latitude, ping.longitude]
    );

    broadcastToOrder(ping.orderId, {
      type: 'location_update',
      orderId: ping.orderId,
      payload: { latitude: ping.latitude, longitude: ping.longitude },
    });
    return { recorded: true };
  },
};
