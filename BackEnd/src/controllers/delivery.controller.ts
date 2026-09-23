import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { deliveryService } from '../services/delivery.service';

export const deliveryController = {
  listAvailableJobs: asyncHandler(async (_req: Request, res: Response) => {
    const jobs = await deliveryService.listAvailableJobs();
    res.status(200).json({ success: true, data: jobs });
  }),

  getCurrentJob: asyncHandler(async (req: Request, res: Response) => {
    const job = await deliveryService.getCurrentJob(Number(req.user?.userId));
    res.status(200).json({ success: true, data: job });
  }),

  acceptJob: asyncHandler(async (req: Request, res: Response) => {
    const job = await deliveryService.acceptJob(Number(req.params.orderId), Number(req.user?.userId));
    res.status(200).json({ success: true, data: job });
  }),

  updateJobStatus: asyncHandler(async (req: Request, res: Response) => {
    const job = await deliveryService.updateJobStatus(Number(req.params.orderId), Number(req.user?.userId), req.body.status);
    res.status(200).json({ success: true, data: job });
  }),

  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const profile = await deliveryService.getProfile(Number(req.user?.userId));
    res.status(200).json({ success: true, data: profile });
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const profile = await deliveryService.updateProfile(Number(req.user?.userId), req.body);
    res.status(200).json({ success: true, data: profile });
  }),
};
