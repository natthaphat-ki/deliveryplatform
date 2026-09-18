import { ApiError } from '../utils/apiError';

export interface LocationPing {
  deliveryId: number;
  orderId: number;
  latitude: number;
  longitude: number;
}

// REST fallback for the last known location; live updates flow over WebSocket (Phase 10).
export const trackingService = {
  async getLastLocation(_orderId: number): Promise<never> {
    throw new ApiError(501, 'trackingService.getLastLocation not implemented yet (Phase 10)');
  },

  async recordLocation(_ping: LocationPing): Promise<never> {
    throw new ApiError(501, 'trackingService.recordLocation not implemented yet (Phase 10)');
  },
};
