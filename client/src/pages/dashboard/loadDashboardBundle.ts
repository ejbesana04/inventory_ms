import CategoryService, { type Category } from "../../services/CategoryService";
import DashboardService, { type DashboardSummary } from "../../services/DashboardService";
import ProductService from "../../services/ProductService";

export interface ProductItem {
  id?: number;
  name: string;
  category: string;
  unitPrice: number;
  qty: number;
  reorder: number;
  notes: string;
  createdAt: string;
}

export interface StockMovementItem {
  id?: number;
  type: "in" | "out" | "adjustment";
  item: string;
  qty: number;
  by: string;
  createdAt?: string;
}

export type DashboardBundle = {
  summary: DashboardSummary | null;
  products: ProductItem[];
  categories: Category[];
  recentMovements: StockMovementItem[];
};

export async function loadDashboardBundle(): Promise<DashboardBundle> {
  const [summaryRes, productsResponse, categoriesResponse] = await Promise.all([
    DashboardService.getSummary(),
    ProductService.getAll(),
    CategoryService.getAll(),
  ]);

  const summaryPayload = (summaryRes as { data?: DashboardSummary })?.data ?? null;

  let recentMovements: StockMovementItem[] = [];
  if (summaryPayload) {
    recentMovements = (summaryPayload.recent_movements ?? []).map((item) => ({
      id: item.id,
      type: item.type as "in" | "out" | "adjustment",
      item: item.item,
      qty: item.qty,
      by: item.by,
      createdAt: item.created_at,
    }));
    recentMovements = recentMovements.slice(0, 5);
  }

  const productEnvelope = (productsResponse as { data?: { items?: Array<Record<string, unknown>> } })?.data;
  const productPayload = productEnvelope?.items;
  let products: ProductItem[] = [];
  if (Array.isArray(productPayload)) {
    products = productPayload.map((item) => ({
      id: typeof item.id === "number" ? item.id : undefined,
      name: String(item.name ?? ""),
      category: String(item.category ?? "Uncategorized"),
      unitPrice: Number(item.unit_price ?? 0),
      qty: Number(item.stock_quantity ?? 0),
      reorder: Number(item.reorder_level ?? 0),
      notes: String(item.notes ?? ""),
      createdAt: String(item.created_at ?? new Date().toISOString()),
    }));
  }

  const categoriesPayload = (categoriesResponse as { data?: Category[] })?.data;
  const categories = Array.isArray(categoriesPayload) ? categoriesPayload : [];

  return {
    summary: summaryPayload,
    products,
    categories,
    recentMovements,
  };
}
