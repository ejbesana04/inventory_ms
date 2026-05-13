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

  /**
   * Downloads the same summary report as PDF (binary). Uses raw axios so `responseType: blob` works.
   */
  downloadSummaryPdf: async (params: { from: string; to: string }): Promise<void> => {
    const response = await AxiosInstance.get<Blob>("v1/reports/summary/pdf", {
      params,
      responseType: "blob",
      headers: { Accept: "application/pdf" },
    });

    const blob = response.data;
    const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    const signature = String.fromCharCode(...header);
    if (signature !== "%PDF") {
      const text = await blob.text();
      let message = "Server did not return a valid PDF.";
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        // keep default message
      }
      throw new Error(message);
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `inventory-summary-${params.from}-to-${params.to}.pdf`;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};

export default ReportService;
