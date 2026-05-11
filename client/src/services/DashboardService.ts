import AxiosInstance from "../api/AxiosInstance";
import { handleRequest } from "../api/apiHandler";

export type DashboardSummary = {
  counts: {
    products: number;
    categories: number;
    suppliers: number;
    low_stock: number;
    out_of_stock: number;
  };
  recent_movements: Array<{
    id: number;
    type: string;
    item: string;
    qty: number;
    by: string;
    created_at: string;
  }>;
  recent_purchases: Array<{
    id: number;
    po_number: string;
    supplier: string | null;
    status: string;
    created_at: string;
  }>;
  recent_sales: Array<{
    id: number;
    sale_no: string;
    customer: string | null;
    total: number;
    status: string;
    created_at: string;
  }>;
  activity_logs: Array<{
    id: number;
    action: string;
    description: string;
    user: string;
    created_at: string;
  }>;
  low_stock_preview: Array<{
    id: number;
    name: string;
    sku: string;
    stock_quantity: number;
    reorder_level: number;
  }>;
};

const DashboardService = {
  getSummary: () =>
    handleRequest(
      AxiosInstance.get<{ status: string; message: string; data: DashboardSummary }>("v1/dashboard/summary"),
      "Failed to load dashboard summary"
    ),
};

export default DashboardService;
