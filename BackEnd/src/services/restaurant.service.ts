import { ApiError } from '../utils/apiError';

export const restaurantService = {
  async list(): Promise<never> {
    throw new ApiError(501, 'restaurantService.list not implemented yet');
  },

  async findById(_id: number): Promise<never> {
    throw new ApiError(501, 'restaurantService.findById not implemented yet');
  },
};
