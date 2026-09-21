import { Router } from 'express';
import { deliveryController } from '../controllers/delivery.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

export const deliveryRoutes = Router();

deliveryRoutes.get('/jobs', authenticate, authorize('delivery'), deliveryController.listAvailableJobs);
deliveryRoutes.post('/jobs/:orderId/accept', authenticate, authorize('delivery'), deliveryController.acceptJob);
deliveryRoutes.patch('/jobs/:orderId/status', authenticate, authorize('delivery'), deliveryController.updateJobStatus);
deliveryRoutes.put('/profile', authenticate, authorize('delivery'), deliveryController.updateProfile);
