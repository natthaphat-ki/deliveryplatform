import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { ApiError } from '../utils/apiError';
import { OrderStatus, ORDER_STATUS_FLOW } from '../types/order';
import { distanceKm, etaMinutesFor } from '../utils/geo';
import { trackingService } from './tracking.service';
import { Role } from '../types/roles';

const PARCEL_SIZE_MULTIPLIER: Record<string, number> = { S: 1.0, M: 1.4, L: 1.9 };

export interface CreateFoodOrderInput {
  type: 'FOOD';
  restaurantId: number;
  items: Array<{ itemId: number; quantity: number }>;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  note?: string | null;
}

export interface CreateParcelOrderInput {
  type: 'PARCEL';
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  size: string;
}

export type CreateOrderInput = (CreateFoodOrderInput | CreateParcelOrderInput) & { customerId: number };

interface OrderRow extends RowDataPacket {
  order_id: number;
  customer_id: number;
  restaurant_id: number | null;
  restaurant_name: string | null;
  status: OrderStatus;
  total_amount: number;
  dropoff_lat: number;
  dropoff_lng: number;
  delivery_id: number | null;
  courier_name: string | null;
  courier_vehicle_type: string | null;
  courier_vehicle_number: string | null;
  courier_phone: string | null;
  type: 'FOOD' | 'PARCEL';
  created_at: Date;
}

const ORDER_SELECT_SQL = `
  SELECT o.order_id, o.customer_id, o.restaurant_id, r.name AS restaurant_name, o.status, o.total_amount,
    o.type, o.created_at,
    o.latitude AS dropoff_lat, o.longitude AS dropoff_lng, o.delivery_id,
    cu.name AS courier_name, dp.vehicle_type AS courier_vehicle_type,
    dp.vehicle_number AS courier_vehicle_number, cu.phone AS courier_phone
  FROM orders o
  LEFT JOIN restaurants r ON r.restaurant_id = o.restaurant_id
  LEFT JOIN delivery_profiles dp ON dp.delivery_id = o.delivery_id
  LEFT JOIN users cu ON cu.user_id = dp.user_id
`;

async function itemCountFor(orderId: number): Promise<number> {
  const [rows] = await pool.query<(RowDataPacket & { total: number })[]>(
    'SELECT COALESCE(SUM(quantity), 0) AS total FROM order_items WHERE order_id = ?',
    [orderId]
  );
  return Number(rows[0]?.total ?? 0);
}

// Wire shape matches FontEnd/User/lib/models/order_tracking.dart's TrackedOrder.fromJson (snake_case).
async function toTrackedOrderJson(row: OrderRow) {
  const tracking = row.status === 'PICKING_UP' || row.status === 'ON_THE_WAY';
  const courierLocation = tracking ? await trackingService.latestLocation(row.order_id) : null;
  // Straight-line ETA to the drop-off; only meaningful once the rider is heading there.
  const etaMinutes =
    courierLocation && row.status === 'ON_THE_WAY'
      ? etaMinutesFor(
          distanceKm(courierLocation.latitude, courierLocation.longitude, Number(row.dropoff_lat), Number(row.dropoff_lng))
        )
      : null;
  return {
    id: row.order_id,
    type: row.type,
    created_at: row.created_at,
    restaurant_name: row.restaurant_name,
    item_count: await itemCountFor(row.order_id),
    total: Number(row.total_amount),
    status: row.status,
    dropoff_lat: Number(row.dropoff_lat),
    dropoff_lng: Number(row.dropoff_lng),
    eta_minutes: etaMinutes,
    courier: row.delivery_id
      ? {
          name: row.courier_name,
          vehicle_type: row.courier_vehicle_type,
          plate_number: row.courier_vehicle_number,
          phone: row.courier_phone,
        }
      : null,
    courier_lat: courierLocation?.latitude ?? null,
    courier_lng: courierLocation?.longitude ?? null,
  };
}

function assertOwnerOrStaff(order: OrderRow, requester: { userId: number; role: Role }): void {
  if (requester.role === 'customer' && order.customer_id !== requester.userId) {
    throw new ApiError(403, 'You do not have access to this order');
  }
}

export const orderService = {
  async create(input: CreateOrderInput) {
    if (input.type === 'FOOD') {
      return createFoodOrder(input);
    }
    return createParcelOrder(input);
  },

  async findById(id: number, requester: { userId: number; role: Role }) {
    const [rows] = await pool.query<OrderRow[]>(`${ORDER_SELECT_SQL} WHERE o.order_id = ?`, [id]);
    const row = rows[0];
    if (!row) {
      throw new ApiError(404, 'Order not found');
    }
    assertOwnerOrStaff(row, requester);
    return toTrackedOrderJson(row);
  },

  async listForCustomer(customerId: number) {
    const [rows] = await pool.query<OrderRow[]>(
      `${ORDER_SELECT_SQL} WHERE o.customer_id = ? ORDER BY o.created_at DESC`,
      [customerId]
    );
    return Promise.all(rows.map((row) => toTrackedOrderJson(row)));
  },

  async updateStatus(orderId: number, status: OrderStatus) {
    if (!ORDER_STATUS_FLOW.includes(status)) {
      throw new ApiError(400, `status must be one of: ${ORDER_STATUS_FLOW.join(', ')}`);
    }
    const [result] = await pool.execute<ResultSetHeader>('UPDATE orders SET status = ? WHERE order_id = ?', [
      status,
      orderId,
    ]);
    if (result.affectedRows === 0) {
      throw new ApiError(404, 'Order not found');
    }
    const [rows] = await pool.query<OrderRow[]>(`${ORDER_SELECT_SQL} WHERE o.order_id = ?`, [orderId]);
    return toTrackedOrderJson(rows[0]);
  },

  async rate(orderId: number, customerId: number, stars: number, comment: string | null) {
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      throw new ApiError(400, 'stars must be an integer between 1 and 5');
    }
    const [rows] = await pool.query<(RowDataPacket & { customer_id: number; status: OrderStatus })[]>(
      'SELECT customer_id, status FROM orders WHERE order_id = ?',
      [orderId]
    );
    const order = rows[0];
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    if (order.customer_id !== customerId) {
      throw new ApiError(403, 'You do not have access to this order');
    }
    if (order.status !== 'DELIVERED') {
      throw new ApiError(409, 'Only delivered orders can be rated');
    }
    await pool.execute<ResultSetHeader>('UPDATE orders SET rating_stars = ?, rating_comment = ? WHERE order_id = ?', [
      stars,
      comment,
      orderId,
    ]);
    return { orderId, stars, comment };
  },
};

async function createFoodOrder(input: CreateFoodOrderInput & { customerId: number }) {
  if (!input.restaurantId || !input.items?.length || !input.dropoffAddress) {
    throw new ApiError(400, 'restaurantId, items, and dropoffAddress are required');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [restaurants] = await connection.query<
      (RowDataPacket & { latitude: number; longitude: number; status: string })[]
    >('SELECT latitude, longitude, status FROM restaurants WHERE restaurant_id = ? FOR UPDATE', [
      input.restaurantId,
    ]);
    const restaurant = restaurants[0];
    if (!restaurant || restaurant.status !== 'active') {
      throw new ApiError(404, 'Restaurant not found');
    }

    const itemIds = input.items.map((item) => item.itemId);
    const [menuRows] = await connection.query<(RowDataPacket & { item_id: number; price: number })[]>(
      `SELECT item_id, price FROM menu_items WHERE restaurant_id = ? AND item_id IN (${itemIds.map(() => '?').join(',')}) AND status = 'available'`,
      [input.restaurantId, ...itemIds]
    );
    const priceByItemId = new Map(menuRows.map((row) => [row.item_id, Number(row.price)]));
    if (priceByItemId.size !== itemIds.length) {
      throw new ApiError(400, 'One or more menu items are invalid or unavailable');
    }

    const subtotal = input.items.reduce((sum, item) => sum + priceByItemId.get(item.itemId)! * item.quantity, 0);
    const distance = distanceKm(
      Number(restaurant.latitude),
      Number(restaurant.longitude),
      input.dropoffLat,
      input.dropoffLng
    );
    const deliveryFee = 15 + distance * 8;
    const totalAmount = subtotal + deliveryFee;

    const [orderResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO orders (customer_id, restaurant_id, status, total_amount, delivery_address, latitude, longitude, type, note)
       VALUES (?, ?, 'WAITING_FOR_DELIVERY', ?, ?, ?, ?, 'FOOD', ?)`,
      [input.customerId, input.restaurantId, totalAmount, input.dropoffAddress, input.dropoffLat, input.dropoffLng, input.note ?? null]
    );
    const orderId = orderResult.insertId;

    for (const item of input.items) {
      const unitPrice = priceByItemId.get(item.itemId)!;
      await connection.execute<ResultSetHeader>(
        'INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.itemId, item.quantity, unitPrice, unitPrice * item.quantity]
      );
    }

    await connection.commit();
    return { id: orderId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createParcelOrder(input: CreateParcelOrderInput & { customerId: number }) {
  if (!input.pickupAddress || !input.dropoffAddress) {
    throw new ApiError(400, 'pickupAddress and dropoffAddress are required');
  }
  const multiplier = PARCEL_SIZE_MULTIPLIER[input.size];
  if (!multiplier) {
    throw new ApiError(400, `size must be one of: ${Object.keys(PARCEL_SIZE_MULTIPLIER).join(', ')}`);
  }

  const distance = distanceKm(input.pickupLat, input.pickupLng, input.dropoffLat, input.dropoffLng);
  const totalAmount = (25 + distance * 8) * multiplier;

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO orders (customer_id, restaurant_id, status, total_amount, delivery_address, latitude, longitude,
       type, pickup_address, pickup_latitude, pickup_longitude, parcel_size)
     VALUES (?, NULL, 'WAITING_FOR_DELIVERY', ?, ?, ?, ?, 'PARCEL', ?, ?, ?, ?)`,
    [
      input.customerId,
      totalAmount,
      input.dropoffAddress,
      input.dropoffLat,
      input.dropoffLng,
      input.pickupAddress,
      input.pickupLat,
      input.pickupLng,
      input.size,
    ]
  );
  return { id: result.insertId };
}
