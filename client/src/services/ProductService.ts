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

/**
 * For edit/update operations.
 * Keep stock changes out of the product edit form if stock is managed
 * through Stock In / Stock Out pages.
 */
export interface ProductUpdatePayload {
  sku?: string;
  name?: string;
  category?: string;
  supplier_id?: number | null;
  unit_price?: number;
  selling_price?: number;
  reorder_level?: number;
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

type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type ProductListEnvelope<TItem = Record<string, unknown>> = {
  status: string;
  message: string;
  data: {
    items: TItem[];
    meta?: PaginationMeta;
  };
};

const ProductService = {
  list: (params?: ProductListParams) =>
    handleRequest(
      AxiosInstance.get(PRODUCT_PREFIX, { params }),
      "Failed to fetch products"
    ),

  /**
   * Fetches all pages so pickers/dropdowns are not cut off by pagination.
   */
  getAll: async <TItem = Record<string, unknown>>() => {
    const perPage = 100;
    let currentPage = 1;
    let lastPage = 1;
    const allItems: TItem[] = [];

    while (currentPage <= lastPage) {
      const response = (await handleRequest(
        AxiosInstance.get<ProductListEnvelope<TItem>>(PRODUCT_PREFIX, {
          params: {
            page: currentPage,
            per_page: perPage,
            sort: "created_at",
            direction: "desc",
          },
        }),
        "Failed to fetch products"
      )) as ProductListEnvelope<TItem>;

      const payload = response.data;
      allItems.push(...(payload?.items ?? []));

      const meta = payload?.meta;
      lastPage = meta?.last_page ?? currentPage;
      currentPage += 1;
    }

    return {
      status: "Success",
      message: "Products fetched successfully.",
      data: {
        items: allItems,
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: allItems.length,
          total: allItems.length,
        },
      },
    } as ProductListEnvelope<TItem>;
  },

  create: (data: ProductPayload) =>
    handleRequest(
      AxiosInstance.post(PRODUCT_PREFIX, data),
      "Failed to create product",
      { silentStatuses: [400, 401, 409, 422, 500, 503] }
    ),

  update: (id: number, data: ProductUpdatePayload) =>
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

  permanentDelete: (id: number) =>
    handleRequest(
      AxiosInstance.delete(`${PRODUCT_PREFIX}/${id}/permanent`),
      "Failed to permanently delete product",
      { silentStatuses: [400, 401, 422, 500, 503] }
    ),

  getRecentMovements: () =>
    handleRequest(
      AxiosInstance.get(STOCK_MOVEMENT_PREFIX),
      "Failed to fetch stock movements"
    ),
};

export default ProductService;