import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

export const orderRoutes = Router();

orderRoutes.post('/', authenticate, authorize('customer'), orderController.create);
orderRoutes.get('/mine', authenticate, authorize('customer'), orderController.listMine);
orderRoutes.get('/:id', authenticate, orderController.getById);
orderRoutes.patch('/:id/status', authenticate, authorize('delivery', 'admin'), orderController.updateStatus);
