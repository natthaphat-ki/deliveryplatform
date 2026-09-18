import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { deliveryService } from '../services/delivery.service';

export const deliveryController = {
  listAvailableJobs: asyncHandler(async (_req: Request, res: Response) => {
    const jobs = await deliveryService.listAvailableJobs();
    res.status(200).json({ success: true, data: jobs });
  }),

  acceptJob: asyncHandler(async (req: Request, res: Response) => {
    const job = await deliveryService.acceptJob(Number(req.params.orderId), Number(req.user?.userId));
    res.status(200).json({ success: true, data: job });
  }),
};
