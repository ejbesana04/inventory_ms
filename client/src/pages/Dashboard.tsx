import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import MainLayout from "../components/layouts/MainLayout";
import { Button, Icon, Modal } from "../components/ui/index";
import { InputField, Select, TextArea } from "../components/ui/forms";
import { PATHS } from "../routes/path";
import { notify } from "../util/notify";
import ProductService from "../services/ProductService";
import CategoryService, { type Category } from "../services/CategoryService";
import DashboardService, { type DashboardSummary } from "../services/DashboardService";

interface NewProductFormState {
  productName: string;
  category: string;
  unitPrice: string;
  stockQty: string;
  reorderLevel: string;
  notes: string;
}

interface ProductItem {
  id?: number;
  name: string;
  category: string;
  unitPrice: number;
  qty: number;
  reorder: number;
  notes: string;
  createdAt: string;
}

interface StockMovementItem {
  id?: number;
  type: "in" | "out" | "adjustment";
  item: string;
  qty: number;
  by: string;
  createdAt?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [productForm, setProductForm] = useState<NewProductFormState>({
    productName: "",
    category: "",
    unitPrice: "",
    stockQty: "",
    reorderLevel: "",
    notes: "",
  });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentMovements, setRecentMovements] = useState<StockMovementItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  const fetchDashboardData = async () => {
    const [summaryRes, productsResponse, categoriesResponse] = await Promise.all([
      DashboardService.getSummary(),
      ProductService.getAll(),
      CategoryService.getAll(),
    ]);

    const summaryPayload = (summaryRes as { data?: DashboardSummary })?.data;
    if (summaryPayload) {
      setSummary(summaryPayload);
      const mappedMovements: StockMovementItem[] = (summaryPayload.recent_movements ?? []).map((item) => ({
        id: item.id,
        type: item.type as "in" | "out" | "adjustment",
        item: item.item,
        qty: item.qty,
        by: item.by,
        createdAt: item.created_at,
      }));
      setRecentMovements(mappedMovements.slice(0, 5)); // LIMIT to 5 items
    } else {
      setSummary(null);
    }

    const productEnvelope = (productsResponse as { data?: { items?: Array<Record<string, unknown>> } })?.data;
    const productPayload = productEnvelope?.items;
    if (Array.isArray(productPayload)) {
      const mappedProducts: ProductItem[] = productPayload.map((item) => ({
        id: typeof item.id === "number" ? item.id : undefined,
        name: String(item.name ?? ""),
        category: String(item.category ?? "Uncategorized"),
        unitPrice: Number(item.unit_price ?? 0),
        qty: Number(item.stock_quantity ?? 0),
        reorder: Number(item.reorder_level ?? 0),
        notes: String(item.notes ?? ""),
        createdAt: String(item.created_at ?? new Date().toISOString()),
      }));
      setProducts(mappedProducts);
    } else {
      setProducts([]);
    }

    const categoriesPayload = (categoriesResponse as { data?: Category[] })?.data;
    if (Array.isArray(categoriesPayload)) {
      setCategories(categoriesPayload);
    } else {
      setCategories([]);
    }
  };

  useEffect(() => {
    const run = async () => {
      setIsLoadingDashboard(true);
      try {
        await fetchDashboardData();
      } catch {
        notify.error("Failed to load dashboard data from server.");
      } finally {
        setIsLoadingDashboard(false);
      }
    };
    run();
  }, []);

  const metricCards = useMemo(() => {
    const c = summary?.counts;
    if (!c) {
      return [
        { label: "Total Products", value: `${products.length}`, trend: "Live from database", icon: "FaBoxesStacked", color: "text-info" },
        { label: "Low Stock Items", value: `${products.filter((item) => item.qty <= item.reorder).length}`, trend: "Needs reorder", icon: "FaTriangleExclamation", color: "text-warning" },
      ];
    }
    return [
      { label: "Total Products", value: `${c.products}`, trend: "Active SKUs", icon: "FaBoxesStacked", color: "text-info" },
      { label: "Categories", value: `${c.categories}`, trend: "Catalog groups", icon: "FaTags", color: "text-primary" },
      { label: "Low Stock", value: `${c.low_stock}`, trend: "At or below reorder", icon: "FaTriangleExclamation", color: "text-warning" },
      { label: "Out of Stock", value: `${c.out_of_stock}`, trend: "Needs replenishment", icon: "FaCircleXmark", color: "text-danger" },
    ];
  }, [summary, products]);

  const lowStock = useMemo(() => {
    if (summary?.low_stock_preview?.length) {
      return summary.low_stock_preview.map((p) => ({
        id: p.id,
        name: p.name,
        category: "—",
        qty: p.stock_quantity,
        reorder: p.reorder_level,
      }));
    }
    return products.filter((item) => item.qty <= item.reorder).slice(0, 8).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      qty: item.qty,
      reorder: item.reorder,
    }));
  }, [summary, products]);

  const latestProducts = useMemo(
    () => [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [products]
  );

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      await fetchDashboardData();
      notify.success("Dashboard data synced successfully.");
    } catch {
      notify.error("Sync failed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNewProduct = () => setIsNewProductModalOpen(true);
  const handleAddCategory = () => setIsAddCategoryModalOpen(true);

  const resetNewProductForm = () => {
    setProductForm({
      productName: "",
      category: "",
      unitPrice: "",
      stockQty: "",
      reorderLevel: "",
      notes: "",
    });
  };

  const closeNewProductModal = () => {
    if (isSavingProduct) return;
    setIsNewProductModalOpen(false);
    resetNewProductForm();
  };

  const closeCategoryModal = () => {
    if (isSavingCategory) return;
    setIsAddCategoryModalOpen(false);
    setNewCategoryName("");
    setNewCategoryDesc("");
  };

  const generateSku = (productName: string): string => {
    const base = productName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    const timestamp = Date.now().toString().slice(-6);
    return `${base || 'PRD'}-${timestamp}`;
  };

  const handleSaveNewProduct = async () => {
    const requiredFields = [
      productForm.productName.trim(),
      productForm.category.trim(),
      productForm.unitPrice.trim(),
      productForm.stockQty.trim(),
      productForm.reorderLevel.trim(),
    ];

    if (requiredFields.some((value) => !value)) {
      notify.warning("Please complete all required product fields.");
      return;
    }

    const unitPrice = Number(productForm.unitPrice);
    const stockQty = Number(productForm.stockQty);
    const reorderLevel = Number(productForm.reorderLevel);

    if ([unitPrice, stockQty, reorderLevel].some((value) => Number.isNaN(value) || value < 0)) {
      notify.warning("Price, stock, and reorder level must be valid positive numbers.");
      return;
    }

    const generatedSku = generateSku(productForm.productName);

    setIsSavingProduct(true);
    try {
      await ProductService.create({
        sku: generatedSku,
        name: productForm.productName.trim(),
        category: productForm.category.trim(),
        unit_price: unitPrice,
        stock_quantity: stockQty,
        reorder_level: reorderLevel,
        notes: productForm.notes.trim() || undefined,
      });
      await fetchDashboardData();
      notify.success(`Product "${productForm.productName}" saved (SKU: ${generatedSku}).`);
      setIsNewProductModalOpen(false);
      resetNewProductForm();
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notify.error(axiosError.response?.data?.message || "Unable to save product.");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleSaveCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      notify.warning("Category name is required.");
      return;
    }

    setIsSavingCategory(true);
    try {
      await CategoryService.create({
        name,
        description: newCategoryDesc.trim() || undefined,
      });
      await fetchDashboardData();
      notify.success(`Category "${name}" added.`);
      closeCategoryModal();
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notify.error(axiosError.response?.data?.message || "Unable to save category.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Limit activity logs to 5 items
  const limitedActivityLogs = summary?.activity_logs?.slice(0, 5) ?? [];

  const content = (
    <>
      <div className="space-y-6 pb-8 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text">Inventory Operations Dashboard</h1>
            <p className="text-sm text-text-muted">Track stock health, sales movement, and team activity in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" iconName="FaPlus" onClick={handleNewProduct}>New Product</Button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-border-muted bg-bg-light p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">{card.label}</p>
                  <p className="text-xl font-bold text-text mt-1">{card.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-bg-main flex items-center justify-center ${card.color}`}>
                  <Icon iconName={card.icon as never} />
                </div>
              </div>
              <p className="text-xs text-text-muted mt-3">{card.trend}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Low Stock Table - no horizontal scroll */}
          <section className="xl:col-span-2 rounded-2xl border border-border-muted bg-bg-light p-4 overflow-x-hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text uppercase tracking-wide">Low Stock Alert</h2>
              <Button variant="ghost" size="sm" iconName="FaListCheck" onClick={() => notify.info("Full list coming soon")}>
                View All
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-auto">
                <thead className="text-text-muted">
                  <tr className="border-b border-border-muted">
                    <th className="text-left py-2">Product</th>
                    <th className="text-left py-2">Category</th>
                    <th className="text-right py-2">Current</th>
                    <th className="text-right py-2">Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((item) => (
                    <tr key={item.id ?? `${item.name}-${item.qty}`} className="border-b border-border-muted/40 last:border-b-0">
                      <td className="py-2 font-medium text-text break-words">{item.name}</td>
                      <td className="py-2 text-text break-words">{item.category}</td>
                      <td className="py-2 text-right text-warning font-semibold">{item.qty}</td>
                      <td className="py-2 text-right text-text">{item.reorder}</td>
                    </tr>
                  ))}
                  {lowStock.length === 0 && (
                    <tr>
                      <td className="py-4 text-text-muted text-center" colSpan={4}>No low stock items.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent Stock Movements */}
          <section className="rounded-2xl border border-border-muted bg-bg-light p-4 overflow-x-hidden">
            <h2 className="text-sm font-semibold text-text uppercase tracking-wide mb-3">Recent Stock Movements</h2>
            <div className="space-y-3">
              {isLoadingDashboard ? (
                <div className="rounded-xl border border-border-muted bg-bg-main p-3">
                  <p className="text-sm text-text-muted">Loading stock movements...</p>
                </div>
              ) : recentMovements.length === 0 ? (
                <div className="rounded-xl border border-border-muted bg-bg-main p-3 text-center">
                  <p className="text-sm text-text-muted">No stock movements recorded.</p>
                </div>
              ) : (
                recentMovements.map((movement, index) => (
                  <div key={`${movement.item}-${index}`} className="rounded-xl border border-border-muted bg-bg-main p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text break-words">{movement.item}</p>
                      <span className="text-xs capitalize px-2 py-1 rounded-md bg-primary/15 text-primary flex-shrink-0">
                        {movement.type}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Qty: <span className="text-text">{movement.qty}</span> | By: {movement.by}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Recent Activity Table - limited to 5 items, no horizontal scroll */}
        {limitedActivityLogs.length > 0 && (
          <section className="rounded-2xl border border-border-muted bg-bg-light p-4 overflow-x-hidden">
            <h2 className="text-sm font-semibold text-text uppercase tracking-wide mb-3">Recent Activity</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-auto">
                <thead className="text-text-muted">
                  <tr className="border-b border-border-muted">
                    <th className="text-left py-2">Time</th>
                    <th className="text-left py-2">User</th>
                    <th className="text-left py-2">Action</th>
                    <th className="text-left py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {limitedActivityLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border-muted/40 last:border-b-0">
                      <td className="py-2 text-text-muted whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 text-text break-words">{log.user}</td>
                      <td className="py-2">
                        <span className="text-xs px-2 py-1 rounded-md bg-info/15 text-info font-semibold break-words">{log.action}</span>
                      </td>
                      <td className="py-2 text-text break-words">{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <div className="rounded-2xl border border-border-muted bg-bg-light p-4">
          <h2 className="text-sm font-semibold text-text uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="primary" iconName="FaPlus" onClick={handleNewProduct}>Add Product</Button>
            <Button variant="outline" iconName="FaPlus" onClick={handleAddCategory}>Add Category</Button>
            <Button variant="outline" iconName="FaFileInvoice" onClick={() => navigate(PATHS.APP.PURCHASE_ORDERS)}>Purchase Order</Button>
            <Button variant="outline" iconName="FaArrowDownLong" onClick={() => navigate(PATHS.APP.STOCK_IN)}>Stock In</Button>
            <Button variant="outline" iconName="FaArrowUpLong" onClick={() => navigate(PATHS.APP.STOCK_OUT)}>Stock Out</Button>
            <Button variant="outline" iconName="FaUsers" onClick={() => navigate(PATHS.APP.USERS)}>Manage Users</Button>
          </div>
        </div>

        {/* Recently Added Products */}
        <div className="rounded-2xl border border-border-muted bg-bg-light p-4 overflow-x-hidden">
          <h2 className="text-sm font-semibold text-text uppercase tracking-wide mb-3">Recently Added Products</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-auto">
              <thead className="text-text-muted">
                <tr className="border-b border-border-muted">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Category</th>
                  <th className="text-right py-2">Stock</th>
                  <th className="text-right py-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {latestProducts.map((product) => (
                  <tr key={`${product.name}-${product.createdAt}`} className="border-b border-border-muted/40 last:border-b-0">
                    <td className="py-2 font-medium text-text break-words">{product.name}</td>
                    <td className="py-2 text-text break-words">{product.category}</td>
                    <td className="py-2 text-right text-text">{product.qty}</td>
                    <td className="py-2 text-right text-text">₱{product.unitPrice.toFixed(2)}</td>
                  </tr>
                ))}
                {latestProducts.length === 0 && (
                  <tr>
                    <td className="py-4 text-text-muted text-center" colSpan={4}>No products found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals remain unchanged */}
      <Modal
        isOpen={isNewProductModalOpen}
        onClose={closeNewProductModal}
        title="New Product"
        size="lg"
        primaryAction={{
          label: "Save Product",
          iconName: "FaFloppyDisk",
          onClick: handleSaveNewProduct,
          isLoading: isSavingProduct,
          loadingText: "Saving",
        }}
        secondaryAction={{
          label: "Cancel",
          variant: "secondary",
          onClick: closeNewProductModal,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            fullWidth
            required
            label="Product Name"
            placeholder="Canned Tuna 155g"
            value={productForm.productName}
            onChange={(e) => setProductForm((prev) => ({ ...prev, productName: e.target.value }))}
          />
          <Select
            fullWidth
            required
            label="Category"
            value={productForm.category}
            onChange={(e) => setProductForm((prev) => ({ ...prev, category: e.target.value }))}
            options={[
              { value: "", label: "Select category" },
              ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
            ]}
          />
          <InputField
            fullWidth
            required
            type="number"
            min="0"
            step="0.01"
            label="Unit Price"
            placeholder="0.00"
            value={productForm.unitPrice}
            onChange={(e) => setProductForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
          />
          <InputField
            fullWidth
            required
            type="number"
            min="0"
            step="1"
            label="Current Stock"
            placeholder="0"
            value={productForm.stockQty}
            onChange={(e) => setProductForm((prev) => ({ ...prev, stockQty: e.target.value }))}
          />
          <InputField
            fullWidth
            required
            type="number"
            min="0"
            step="1"
            label="Reorder Level"
            placeholder="0"
            value={productForm.reorderLevel}
            onChange={(e) => setProductForm((prev) => ({ ...prev, reorderLevel: e.target.value }))}
          />
          <div className="md:col-span-2">
            <TextArea
              fullWidth
              label="Notes"
              placeholder="Optional notes about supplier, packaging, or handling."
              value={productForm.notes}
              onChange={(e) => setProductForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddCategoryModalOpen}
        onClose={closeCategoryModal}
        title="Add Category"
        primaryAction={{
          label: "Save Category",
          iconName: "FaFloppyDisk",
          onClick: handleSaveCategory,
          isLoading: isSavingCategory,
          loadingText: "Saving",
        }}
        secondaryAction={{
          label: "Cancel",
          variant: "secondary",
          onClick: closeCategoryModal,
        }}
      >
        <div className="space-y-4">
          <InputField
            fullWidth
            required
            label="Category Name"
            placeholder="Beverages"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <TextArea
            fullWidth
            label="Description"
            placeholder="Optional category description."
            value={newCategoryDesc}
            onChange={(e) => setNewCategoryDesc(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );

  return <MainLayout content={content} />;
};

export default Dashboard;