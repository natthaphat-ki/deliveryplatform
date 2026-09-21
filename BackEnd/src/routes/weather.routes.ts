import { Router } from 'express';
import { weatherController } from '../controllers/weather.controller';

export const weatherRoutes = Router();

// Public so customers can see delivery conditions before placing an order.
weatherRoutes.get('/', weatherController.getForecast);
