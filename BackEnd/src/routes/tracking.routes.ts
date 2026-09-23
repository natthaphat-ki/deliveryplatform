import { Router } from 'express';
import { trackingController } from '../controllers/tracking.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

export const trackingRoutes = Router();

trackingRoutes.get('/:orderId', authenticate, trackingController.getLastLocation);
trackingRoutes.post('/:orderId', authenticate, authorize('delivery'), trackingController.recordLocation);
