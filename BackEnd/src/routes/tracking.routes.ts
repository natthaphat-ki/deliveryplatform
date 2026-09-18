import { Router } from 'express';
import { trackingController } from '../controllers/tracking.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const trackingRoutes = Router();

trackingRoutes.get('/:orderId', authenticate, trackingController.getLastLocation);
