import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

export const userRoutes = Router();

// Admin manages/inspects Customer and Delivery accounts.
userRoutes.get('/', authenticate, authorize('admin'), userController.list);
userRoutes.get('/:id', authenticate, authorize('admin'), userController.getById);
