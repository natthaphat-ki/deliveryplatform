import { ApiError } from '../utils/apiError';
import { OrderStatus } from '../types/order';

export interface CreateOrderInput {
  customerId: number;
  restaurantId: number;
  items: Array<{ itemId: number; quantity: number }>;
  deliveryAddress: string;
  latitude: number;
  longitude: number;
}

// Full Create -> Assign -> Accept -> Picking Up -> On The Way -> Delivered flow lands in Phase 08.
export const orderService = {
  async create(_input: CreateOrderInput): Promise<never> {
    throw new ApiError(501, 'orderService.create not implemented yet (Phase 08)');
  },

  async findById(_id: number): Promise<never> {
    throw new ApiError(501, 'orderService.findById not implemented yet (Phase 08)');
  },

  async listForCustomer(_customerId: number): Promise<never> {
    throw new ApiError(501, 'orderService.listForCustomer not implemented yet (Phase 08)');
  },

  async updateStatus(_orderId: number, _status: OrderStatus): Promise<never> {
    throw new ApiError(501, 'orderService.updateStatus not implemented yet (Phase 08)');
  },
};
