import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { orderService } from '../services/order.service';

export const orderController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.create({ ...req.body, customerId: req.user?.userId });
    res.status(201).json({ success: true, data: order });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.findById(Number(req.params.id));
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
};
