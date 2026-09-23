import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { orderService, CreateOrderInput } from '../services/order.service';
import { ApiError } from '../utils/apiError';

// Wire body matches FontEnd/User/lib/features/customer/data/order_service.dart (snake_case).
function parseCreateInput(body: Record<string, unknown>, customerId: number): CreateOrderInput {
  if (body.type === 'FOOD') {
    const items = Array.isArray(body.items)
      ? (body.items as Array<{ menu_item_id: number; qty: number }>).map((item) => ({
          itemId: Number(item.menu_item_id),
          quantity: Number(item.qty),
        }))
      : [];
    return {
      type: 'FOOD',
      customerId,
      restaurantId: Number(body.restaurant_id),
      items,
      dropoffAddress: String(body.dropoff_address ?? ''),
      dropoffLat: Number(body.dropoff_lat),
      dropoffLng: Number(body.dropoff_lng),
      note: (body.note as string | null | undefined) ?? null,
    };
  }
  if (body.type === 'PARCEL') {
    return {
      type: 'PARCEL',
      customerId,
      pickupAddress: String(body.pickup_address ?? ''),
      pickupLat: Number(body.pickup_lat),
      pickupLng: Number(body.pickup_lng),
      dropoffAddress: String(body.dropoff_address ?? ''),
      dropoffLat: Number(body.dropoff_lat),
      dropoffLng: Number(body.dropoff_lng),
      size: String(body.size ?? ''),
    };
  }
  throw new ApiError(400, "type must be 'FOOD' or 'PARCEL'");
}

export const orderController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const input = parseCreateInput(req.body, Number(req.user?.userId));
    const order = await orderService.create(input);
    res.status(201).json({ success: true, data: order });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.findById(Number(req.params.id), {
      userId: Number(req.user?.userId),
      role: req.user!.role,
    });
    res.status(200).json({ success: true, data: order });
  }),

  listMine: asyncHandler(async (req: Request, res: Response) => {
    const orders = await orderService.listForCustomer(Number(req.user?.userId));
    res.status(200).json({ success: true, data: orders });
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.updateStatus(Number(req.params.id), req.body.status);
    res.status(200).json({ success: true, data: order });
  }),

  rate: asyncHandler(async (req: Request, res: Response) => {
    const result = await orderService.rate(
      Number(req.params.id),
      Number(req.user?.userId),
      Number(req.body.stars),
      (req.body.comment as string | null | undefined) ?? null
    );
    res.status(200).json({ success: true, data: result });
  }),
};
