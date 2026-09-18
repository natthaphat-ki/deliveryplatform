import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    res.status(201).json({ success: true, data: user });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const session = await authService.login(req.body);
    res.status(200).json({ success: true, data: session });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.findById(Number(req.user?.userId));
    res.status(200).json({ success: true, data: user });
  }),
};