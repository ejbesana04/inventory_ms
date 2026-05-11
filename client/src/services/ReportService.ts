import AxiosInstance from "../api/AxiosInstance";
import { handleRequest } from "../api/apiHandler";

type ReportSummaryParams = {
  from?: string;
  to?: string;
};

export type ReportSummaryPayload = {
  period: {
    from: string;
    to: string;
  };
  kpis: {
    products: number;
    suppliers: number;
    low_stock: number;
    sales_count: number;
    sales_total: number;
    purchase_count: number;
    stock_in_qty: number;
    stock_out_qty: number;
  };
  low_stock_items: Array<{
    id: number;
    name: string;
    sku: string;
    category: string;
    stock_quantity: number;
    reorder_level: number;
  }>;
  recent_sales: Array<{
    id: number;
    sale_no: string;
    customer: string | null;
    total: number;
    status: string;
    created_at: string;
  }>;
};

const ReportService = {
  getSummary: (params?: ReportSummaryParams) =>
    handleRequest(
      AxiosInstance.get<{ status: string; message: string; data: ReportSummaryPayload }>("v1/reports/summary", { params }),
      "Failed to fetch reports summary"
    ),
};

export default ReportService;
