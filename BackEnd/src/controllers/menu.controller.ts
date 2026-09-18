import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { menuService } from '../services/menu.service';

export const menuController = {
  listByRestaurant: asyncHandler(async (req: Request, res: Response) => {
    const items = await menuService.listByRestaurant(Number(req.params.id));
    res.status(200).json({ success: true, data: items });
  }),
};
