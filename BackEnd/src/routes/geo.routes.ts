import { Router } from 'express';
import { geoController } from '../controllers/geo.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const geoRoutes = Router();

// Authenticated so the map API key can't be used as an open proxy.
geoRoutes.get('/search', authenticate, geoController.search);
geoRoutes.get('/reverse', authenticate, geoController.reverse);
