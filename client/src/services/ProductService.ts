import AxiosInstance from "../api/AxiosInstance";
import { handleRequest } from "../api/apiHandler";

const PRODUCT_PREFIX = "v1/products";
const STOCK_MOVEMENT_PREFIX = "v1/stock-movements";

export interface ProductPayload {
  sku: string;
  name: string;
  category: string;
  supplier_id?: number | null;
  unit_price: number;
  stock_quantity: number;
  reorder_level: number;
  notes?: string;
}

export type ProductListParams = {
  search?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: "asc" | "desc";
  low_stock?: boolean;
  /** List soft-deleted products only */
  filter?: "archived";
};

const ProductService = {
  list: (params?: ProductListParams) =>
    handleRequest(
      AxiosInstance.get(PRODUCT_PREFIX, { params }),
      "Failed to fetch products"
    ),

  /** @deprecated prefer list(); kept for older callers */
  getAll: () =>
    handleRequest(
      AxiosInstance.get(PRODUCT_PREFIX, { params: { per_page: 500 } }),
      "Failed to fetch products"
    ),

  create: (data: ProductPayload) =>
    handleRequest(
      AxiosInstance.post(PRODUCT_PREFIX, data),
      "Failed to create product",
      { silentStatuses: [400, 401, 409, 422, 500, 503] }
    ),

  update: (id: number, data: Partial<ProductPayload> & Record<string, unknown>) =>
    handleRequest(
      AxiosInstance.put(`${PRODUCT_PREFIX}/${id}`, data),
      "Failed to update product",
      { silentStatuses: [400, 401, 422, 500, 503] }
    ),

  remove: (id: number) =>
    handleRequest(
      AxiosInstance.delete(`${PRODUCT_PREFIX}/${id}`),
      "Failed to delete product",
      { silentStatuses: [400, 401, 422, 500, 503] }
    ),

  restore: (id: number) =>
    handleRequest(
      AxiosInstance.post(`${PRODUCT_PREFIX}/${id}/restore`),
      "Failed to restore product",
      { silentStatuses: [400, 401, 422, 500, 503] }
    ),

  getRecentMovements: () =>
    handleRequest(
      AxiosInstance.get(STOCK_MOVEMENT_PREFIX),
      "Failed to fetch stock movements"
    ),
};

export default ProductService;
