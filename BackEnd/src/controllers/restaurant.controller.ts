import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { restaurantService } from '../services/restaurant.service';

export const restaurantController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const restaurants = await restaurantService.list({
      lat: Number(req.query.lat),
      lng: Number(req.query.lng),
    });
    res.status(200).json({ success: true, data: restaurants });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantService.findById(Number(req.params.id));
    res.status(200).json({ success: true, data: restaurant });
  }),
};
