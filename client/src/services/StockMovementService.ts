import AxiosInstance from "../api/AxiosInstance";
import type { Product } from "../services/ProductService";

export interface StockMovement {
  id: number;
  product_id: number;
  product: Product;           // nested from API
  user_id?: number;
  user?: { id: number; name: string };
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
  created_at: string;
}

const StockMovementService = {
  getRecent: async (limit: number = 10) => {
    const response = await AxiosInstance.get<{ data: StockMovement[] }>(`/stock-movements/recent?limit=${limit}`);
    return response.data;
  },

  getAll: async (params?: Record<string, any>) => {
    const response = await AxiosInstance.get<{ data: StockMovement[] }>('/stock-movements', { params });
    return response.data;
  },
};

export default StockMovementService;