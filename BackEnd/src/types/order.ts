// Mirrors the `orders` table status column (see Database Design doc, section 4).
export type OrderStatus =
  | 'PENDING'
  | 'WAITING_FOR_DELIVERY'
  | 'ACCEPTED'
  | 'PICKING_UP'
  | 'ON_THE_WAY'
  | 'DELIVERED';

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'PENDING',
  'WAITING_FOR_DELIVERY',
  'ACCEPTED',
  'PICKING_UP',
  'ON_THE_WAY',
  'DELIVERED',
];
