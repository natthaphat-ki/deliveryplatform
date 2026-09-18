import { Router } from 'express';
import { restaurantController } from '../controllers/restaurant.controller';
import { menuController } from '../controllers/menu.controller';

export const restaurantRoutes = Router();

restaurantRoutes.get('/', restaurantController.list);
restaurantRoutes.get('/:id', restaurantController.getById);
restaurantRoutes.get('/:id/menu', menuController.listByRestaurant);
