import AxiosInstance from "../api/AxiosInstance";
import { handleRequest } from "../api/apiHandler";

export type PurchaseOrderLineInput = {
  product_id: number;
  quantity_ordered: number;
  unit_cost: number;
};

export type CreatePurchaseOrderPayload = {
  supplier_id: number;
  warehouse_id?: number | null;
  order_date?: string;
  expected_date?: string;
  notes?: string;
  lines: PurchaseOrderLineInput[];
};

const PREFIX = "v1/purchase-orders";

const PurchaseOrderService = {
  list: (page = 1) =>
    handleRequest(AxiosInstance.get(PREFIX, { params: { page } }), "Failed to load purchase orders"),

  create: (payload: CreatePurchaseOrderPayload) =>
    handleRequest(AxiosInstance.post(PREFIX, payload), "Failed to create purchase order", {
      silentStatuses: [400, 401, 422, 500, 503],
    }),

  update: (id: number, payload: { status?: string; expected_date?: string | null; notes?: string | null }) =>
    handleRequest(AxiosInstance.patch(`${PREFIX}/${id}`, payload), "Failed to update purchase order", {
      silentStatuses: [400, 401, 422, 500, 503],
    }),

  receive: (id: number) =>
    handleRequest(AxiosInstance.post(`${PREFIX}/${id}/receive`), "Failed to receive purchase order", {
      silentStatuses: [400, 401, 422, 500, 503],
    }),
};

export default PurchaseOrderService;
