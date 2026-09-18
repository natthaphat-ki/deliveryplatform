import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { restaurantRoutes } from './restaurant.routes';
import { orderRoutes } from './order.routes';
import { deliveryRoutes } from './delivery.routes';
import { trackingRoutes } from './tracking.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/restaurants', restaurantRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/delivery', deliveryRoutes);
apiRouter.use('/tracking', trackingRoutes);
