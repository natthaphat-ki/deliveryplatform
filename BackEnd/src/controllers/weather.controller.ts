import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { weatherService } from '../services/weather.service';

export const weatherController = {
  getForecast: asyncHandler(async (req: Request, res: Response) => {
    const forecast = await weatherService.getForecast({
      latitude: Number(req.query.latitude),
      longitude: Number(req.query.longitude),
    });

    res.status(200).json({ success: true, data: forecast });
  }),
};
