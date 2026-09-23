import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { trackingService } from '../services/tracking.service';

export const trackingController = {
  getLastLocation: asyncHandler(async (req: Request, res: Response) => {
    const location = await trackingService.getLastLocation(Number(req.params.orderId), {
      userId: Number(req.user?.userId),
      role: req.user!.role,
    });
    res.status(200).json({ success: true, data: location });
  }),

  recordLocation: asyncHandler(async (req: Request, res: Response) => {
    const result = await trackingService.recordLocation({
      userId: Number(req.user?.userId),
      orderId: Number(req.params.orderId),
      latitude: Number(req.body.latitude),
      longitude: Number(req.body.longitude),
    });
    res.status(201).json({ success: true, data: result });
  }),
};
