import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { userService } from '../services/user.service';

export const userController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const users = await userService.list();
    res.status(200).json({ success: true, data: users });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.findById(Number(req.params.id));
    res.status(200).json({ success: true, data: user });
  }),
};
