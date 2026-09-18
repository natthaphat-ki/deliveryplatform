import { ApiError } from '../utils/apiError';

export const deliveryService = {
  async listAvailableJobs(): Promise<never> {
    throw new ApiError(501, 'เดริเวอร์ยังไม่ได้ถูกพัฒนาขึ้น รอก่อนบักหำ');
  },

  async acceptJob(_orderId: number, _deliveryId: number): Promise<never> {
    throw new ApiError(501, 'เดริเวอร์ยังไม่ได้ถูกพัฒนาขึ้น');
  },
};
