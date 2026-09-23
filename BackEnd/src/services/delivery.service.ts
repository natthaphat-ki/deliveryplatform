import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { ApiError } from '../utils/apiError';
import { OrderStatus } from '../types/order';

type DeliveryAvailability = 'available' | 'busy' | 'offline';
export interface UpdateDeliveryProfileInput { vehicleType: string; vehicleNumber: string; availabilityStatus?: DeliveryAvailability; }
interface DeliveryProfileRow extends RowDataPacket { delivery_id: number; availability_status: DeliveryAvailability; }
interface DeliveryJobRow extends RowDataPacket {
  order_id: number; status: OrderStatus; total_amount: number; delivery_address: string; latitude: number; longitude: number; created_at: Date;
  type: 'FOOD' | 'PARCEL'; note: string | null; parcel_size: string | null;
  restaurant_id: number | null; restaurant_name: string | null; restaurant_address: string | null;
  restaurant_latitude: number | null; restaurant_longitude: number | null;
  pickup_address: string | null; pickup_latitude: number | null; pickup_longitude: number | null;
  customer_name: string; customer_phone: string;
}
interface JobItem { name: string; quantity: number; }

// LEFT JOIN restaurants: PARCEL orders have no restaurant and use the pickup_* columns instead.
const JOB_SELECT_SQL = `
  SELECT o.order_id, o.status, o.total_amount, o.delivery_address, o.latitude, o.longitude, o.created_at,
    o.type, o.note, o.parcel_size, o.pickup_address, o.pickup_latitude, o.pickup_longitude,
    r.restaurant_id, r.name AS restaurant_name, r.address AS restaurant_address, r.latitude AS restaurant_latitude, r.longitude AS restaurant_longitude,
    u.name AS customer_name, u.phone AS customer_phone
  FROM orders o LEFT JOIN restaurants r ON r.restaurant_id = o.restaurant_id JOIN users u ON u.user_id = o.customer_id`;
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = { ACCEPTED: 'PICKING_UP', PICKING_UP: 'ON_THE_WAY', ON_THE_WAY: 'DELIVERED' };

function toDeliveryJob(row: DeliveryJobRow, items: JobItem[]) {
  const isParcel = row.type === 'PARCEL';
  return {
    orderId: row.order_id, status: row.status, totalAmount: Number(row.total_amount), createdAt: row.created_at,
    type: row.type, note: row.note, parcelSize: row.parcel_size, items,
    pickup: isParcel
      ? { restaurantId: null, name: 'รับพัสดุ', address: row.pickup_address, latitude: Number(row.pickup_latitude), longitude: Number(row.pickup_longitude) }
      : { restaurantId: row.restaurant_id, name: row.restaurant_name, address: row.restaurant_address, latitude: Number(row.restaurant_latitude), longitude: Number(row.restaurant_longitude) },
    dropoff: { address: row.delivery_address, latitude: Number(row.latitude), longitude: Number(row.longitude), customerName: row.customer_name, customerPhone: row.customer_phone },
  };
}

async function loadItems(orderIds: number[]): Promise<Map<number, JobItem[]>> {
  const itemsByOrder = new Map<number, JobItem[]>();
  if (orderIds.length === 0) return itemsByOrder;
  const [rows] = await pool.query<(RowDataPacket & { order_id: number; name: string; quantity: number })[]>(
    `SELECT oi.order_id, mi.name, oi.quantity FROM order_items oi JOIN menu_items mi ON mi.item_id = oi.item_id
     WHERE oi.order_id IN (?) ORDER BY oi.order_item_id`, [orderIds]);
  for (const row of rows) {
    const items = itemsByOrder.get(row.order_id) ?? [];
    items.push({ name: row.name, quantity: Number(row.quantity) });
    itemsByOrder.set(row.order_id, items);
  }
  return itemsByOrder;
}

async function toDeliveryJobs(rows: DeliveryJobRow[]) {
  const itemsByOrder = await loadItems(rows.filter((row) => row.type === 'FOOD').map((row) => row.order_id));
  return rows.map((row) => toDeliveryJob(row, itemsByOrder.get(row.order_id) ?? []));
}
function assertOrderId(orderId: number): void {
  if (!Number.isInteger(orderId) || orderId <= 0) throw new ApiError(400, 'orderId must be a positive integer');
}

export const deliveryService = {
  async listAvailableJobs() {
    const [rows] = await pool.query<DeliveryJobRow[]>(`${JOB_SELECT_SQL} WHERE o.status = 'WAITING_FOR_DELIVERY' AND o.delivery_id IS NULL ORDER BY o.created_at ASC`);
    return toDeliveryJobs(rows);
  },

  /** The rider's in-progress job (accepted / picking up / on the way), or null. Lets the app resume after a restart. */
  async getCurrentJob(userId: number) {
    const [rows] = await pool.query<DeliveryJobRow[]>(
      `${JOB_SELECT_SQL} JOIN delivery_profiles dp ON dp.delivery_id = o.delivery_id
       WHERE dp.user_id = ? AND o.status IN ('ACCEPTED', 'PICKING_UP', 'ON_THE_WAY')
       ORDER BY o.updated_at DESC LIMIT 1`, [userId]);
    if (rows.length === 0) return null;
    return (await toDeliveryJobs(rows))[0];
  },

  async acceptJob(orderId: number, userId: number) {
    assertOrderId(orderId);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [profiles] = await connection.query<DeliveryProfileRow[]>(
        `SELECT dp.delivery_id, dp.availability_status FROM delivery_profiles dp JOIN users u ON u.user_id = dp.user_id
         WHERE dp.user_id = ? AND u.status = 'active' FOR UPDATE`, [userId]);
      const profile = profiles[0];
      if (!profile) throw new ApiError(404, 'Delivery profile not found');
      if (profile.availability_status !== 'available') throw new ApiError(409, 'Delivery rider is not available');
      const [assignment] = await connection.execute<ResultSetHeader>(
        `UPDATE orders SET delivery_id = ?, status = 'ACCEPTED'
         WHERE order_id = ? AND delivery_id IS NULL AND status = 'WAITING_FOR_DELIVERY'`, [profile.delivery_id, orderId]);
      if (assignment.affectedRows !== 1) throw new ApiError(409, 'This job is no longer available');
      await connection.execute<ResultSetHeader>("UPDATE delivery_profiles SET availability_status = 'busy' WHERE delivery_id = ?", [profile.delivery_id]);
      await connection.commit();
      const [jobs] = await pool.query<DeliveryJobRow[]>(`${JOB_SELECT_SQL} WHERE o.order_id = ?`, [orderId]);
      return (await toDeliveryJobs(jobs))[0];
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  },

  async updateJobStatus(orderId: number, userId: number, nextStatus: OrderStatus) {
    assertOrderId(orderId);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [orders] = await connection.query<(RowDataPacket & { status: OrderStatus; delivery_id: number })[]>(
        `SELECT o.status, o.delivery_id FROM orders o JOIN delivery_profiles dp ON dp.delivery_id = o.delivery_id
         WHERE o.order_id = ? AND dp.user_id = ? FOR UPDATE`, [orderId, userId]);
      const order = orders[0];
      if (!order) throw new ApiError(404, 'Assigned delivery job not found');
      if (NEXT_STATUS[order.status] !== nextStatus) throw new ApiError(409, `Cannot change status from ${order.status} to ${nextStatus}`);
      await connection.execute<ResultSetHeader>('UPDATE orders SET status = ? WHERE order_id = ?', [nextStatus, orderId]);
      if (nextStatus === 'DELIVERED') await connection.execute<ResultSetHeader>(
        "UPDATE delivery_profiles SET availability_status = 'available' WHERE delivery_id = ?", [order.delivery_id]);
      await connection.commit();
      const [jobs] = await pool.query<DeliveryJobRow[]>(`${JOB_SELECT_SQL} WHERE o.order_id = ?`, [orderId]);
      return (await toDeliveryJobs(jobs))[0];
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  },

  async updateProfile(userId: number, input: UpdateDeliveryProfileInput) {
    const vehicleType = input.vehicleType?.trim();
    const vehicleNumber = input.vehicleNumber?.trim();
    const availabilityStatus = input.availabilityStatus ?? 'available';
    if (!vehicleType || !vehicleNumber) throw new ApiError(400, 'vehicleType and vehicleNumber are required');
    if (!['available', 'busy', 'offline'].includes(availabilityStatus)) throw new ApiError(400, 'availabilityStatus must be available, busy, or offline');
    await pool.execute<ResultSetHeader>(
      `INSERT INTO delivery_profiles (user_id, vehicle_type, vehicle_number, availability_status) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE vehicle_type = VALUES(vehicle_type), vehicle_number = VALUES(vehicle_number),
       availability_status = IF(availability_status = 'busy', 'busy', VALUES(availability_status))`,
      [userId, vehicleType, vehicleNumber, availabilityStatus]);
    return deliveryService.getProfile(userId);
  },

  async getProfile(userId: number) {
    const [profiles] = await pool.query<(RowDataPacket & { delivery_id: number; vehicle_type: string; vehicle_number: string; availability_status: DeliveryAvailability })[]>(
      'SELECT delivery_id, vehicle_type, vehicle_number, availability_status FROM delivery_profiles WHERE user_id = ?', [userId]);
    const profile = profiles[0];
    if (!profile) throw new ApiError(404, 'Delivery profile not found');
    return { deliveryId: profile.delivery_id, vehicleType: profile.vehicle_type, vehicleNumber: profile.vehicle_number, availabilityStatus: profile.availability_status };
  },
};
