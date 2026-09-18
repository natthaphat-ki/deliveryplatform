import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { trackingService } from '../services/tracking.service';

export const trackingController = {
  getLastLocation: asyncHandler(async (req: Request, res: Response) => {
    const location = await trackingService.getLastLocation(Number(req.params.orderId));
    res.status(200).json({ success: true, data: location });
  }),
};
