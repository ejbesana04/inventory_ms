import AxiosInstance from "../api/AxiosInstance";
import { handleRequest } from "../api/apiHandler";

export type SaleLineInput = {
  product_id: number;
  quantity: number;
  unit_price: number;
};

export type CreateSalePayload = {
  customer_id?: number | null;
  payment_method: "cash" | "gcash" | "card" | "bank_transfer";
  discount?: number;
  tax?: number;
  items: SaleLineInput[];
};

export type SalesAnalysisResponse = {
  data?: {
    analysis?: string;
  };
};

const PREFIX = "v1/sales";

const SaleService = {
  list: (page = 1) => handleRequest(AxiosInstance.get(PREFIX, { params: { page } }), "Failed to load sales"),

  create: (payload: CreateSalePayload) =>
    handleRequest(AxiosInstance.post(PREFIX, payload), "Failed to record sale", {
      silentStatuses: [400, 401, 422, 500, 503],
    }),

  aiAnalysis: () =>
    handleRequest<SalesAnalysisResponse>(
      AxiosInstance.post(`${PREFIX}/ai-analysis`),
      "Failed to generate sales analysis",
      {
        silentStatuses: [400, 401, 422, 502, 503],
      }
    ),
};

export default SaleService;
