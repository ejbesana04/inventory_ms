import AxiosInstance from "../api/AxiosInstance";
import { handleRequest } from "../api/apiHandler";

export type StockMovementPayload = {
  product_id: number;
  movement_type: "in" | "out" | "adjustment";
  quantity: number;
  warehouse_id?: number | null;
  reason?: string;
  admin_override?: boolean;
};

const StockService = {
  record: (payload: StockMovementPayload) =>
    handleRequest(
      AxiosInstance.post("v1/stock-movements", payload),
      "Failed to record stock movement",
      { silentStatuses: [400, 401, 422, 500, 503] }
    ),
};

export default StockService;
