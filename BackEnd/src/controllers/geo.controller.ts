import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { geoService } from '../services/geo.service';

export const geoController = {
  search: asyncHandler(async (req: Request, res: Response) => {
    const places = await geoService.search(String(req.query.q ?? ''));
    res.status(200).json({ success: true, data: places });
  }),

  reverse: asyncHandler(async (req: Request, res: Response) => {
    const result = await geoService.reverse(Number(req.query.lat), Number(req.query.lng));
    res.status(200).json({ success: true, data: result });
  }),
};
