import { ApiError } from '../utils/apiError';

export const menuService = {
  async listByRestaurant(_restaurantId: number): Promise<never> {
    throw new ApiError(501, 'menuService.listByRestaurant not implemented yet');
  },
};
