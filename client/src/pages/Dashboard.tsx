import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import MainLayout from "../components/layouts/MainLayout";
import { DashboardSkeleton } from "../components/page/DashboardSkeleton";
import { PageShell } from "../components/page/PageShell";
import { Button, Icon, Modal } from "../components/ui/index";
import { InputField, Select, TextArea } from "../components/ui/forms";
import { PATHS } from "../routes/path";
import { notify } from "../util/notify";
import ProductService from "../services/ProductService";
import CategoryService, { type Category } from "../services/CategoryService";
import type { DashboardSummary } from "../services/DashboardService";
import {
  loadDashboardBundle,
  type ProductItem,
  type StockMovementItem,
} from "./dashboard/loadDashboardBundle";

interface NewProductFormState {
  productName: string;
  category: string;
  unitPrice: string;
  stockQty: string;
  reorderLevel: string;
  notes: string;
}

interface NewCategoryFormState {
  name: string;
  description: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isAddingCategoryInline, setIsAddingCategoryInline] = useState(false);

  const [productForm, setProductForm] = useState<NewProductFormState>({
    productName: "",
    category: "",
    unitPrice: "",
    stockQty: "",
    reorderLevel: "",
    notes: "",
  });

  const [categoryForm, setCategoryForm] = useState<NewCategoryFormState>({
    name: "",
    description: "",
  });

  const [bundle, setBundle] = useState<{
    summary: DashboardSummary | null;
    products: ProductItem[];
    categories: Category[];
    recentMovements: StockMovementItem[];
  } | null>(null);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadBundle = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsInitialLoad(true);
    }
    setLoadError(false);

    try {
      const data = await loadDashboardBundle();
      setBundle(data);
    } catch {
      setLoadError(true);
      if (!silent) notify.error("Failed to load dashboard data from server.");
    } finally {
      setIsInitialLoad(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBundle();
  }, [loadBundle]);

  const summary = bundle?.summary ?? null;
  const products = bundle?.products ?? [];
  const categories = bundle?.categories ?? [];
  const recentMovements = bundle?.recentMovements ?? [];

  const metricCards = useMemo(() => {
    const c = summary?.counts;
    if (!c) {
      return [
        {
          label: "Total Products",
          value: `${products.length}`,
          trend: "Live from database",
          icon: "FaBoxesStacked",
          color: "text-info",
        },
        {
          label: "Low Stock Items",
          value: `${products.filter((item) => item.qty <= item.reorder).length}`,
          trend: "Needs reorder",
          icon: "FaTriangleExclamation",
          color: "text-warning",
        },
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
        category: p.category ?? "Uncategorized",
        qty: p.stock_quantity,
        reorder: p.reorder_level,
      }));
    }

    return products
      .filter((item) => item.qty <= item.reorder)
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        qty: item.qty,
        reorder: item.reorder,
      }));
  }, [summary, products]);

  const latestProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [products]
  );

  const handleNewProduct = () => setIsNewProductModalOpen(true);

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

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      description: "",
    });
  };

  const closeNewProductModal = () => {
    if (isSavingProduct || isSavingCategory) return;
    setIsNewProductModalOpen(false);
    setIsAddingCategoryInline(false);
    resetNewProductForm();
    resetCategoryForm();
  };

  const generateSku = (productName: string): string => {
    const base = productName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "");
    const timestamp = Date.now().toString().slice(-6);
    return `${base || "PRD"}-${timestamp}`;
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

      await loadBundle({ silent: true });
      notify.success(`Product "${productForm.productName}" saved (SKU: ${generatedSku}).`);
      setIsNewProductModalOpen(false);
      setIsAddingCategoryInline(false);
      resetNewProductForm();
      resetCategoryForm();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      notify.error(axiosError.response?.data?.message || "Unable to save product.");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleShowCategoryInlineForm = () => {
    setIsAddingCategoryInline(true);
  };

  const handleCancelCategoryInlineForm = () => {
    if (isSavingCategory) return;
    setIsAddingCategoryInline(false);
    resetCategoryForm();
  };

  const handleSaveCategoryInline = async () => {
    const name = categoryForm.name.trim();
    if (!name) {
      notify.warning("Category name is required.");
      return;
    }

    setIsSavingCategory(true);
    try {
      await CategoryService.create({
        name,
        description: categoryForm.description.trim() || undefined,
      });

      await loadBundle({ silent: true });
      setProductForm((prev) => ({ ...prev, category: name }));
      notify.success(`Category "${name}" added.`);
      setIsAddingCategoryInline(false);
      resetCategoryForm();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      notify.error(axiosError.response?.data?.message || "Unable to save category.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const limitedActivityLogs = summary?.activity_logs?.slice(0, 5) ?? [];

  if (!isInitialLoad && loadError && !bundle) {
    return (
      <MainLayout
        content={
          <div className="rounded-2xl border border-danger/25 bg-bg-light p-8 text-center shadow-sm">
            <p className="text-text font-semibold">Unable to load dashboard.</p>
            <Button className="mt-4" variant="primary" iconName="FaArrowRotateRight" onClick={() => void loadBundle()}>
              Retry
            </Button>
          </div>
        }
      />
    );
  }

  const body = (
    <PageShell
      isInitialLoading={isInitialLoad && bundle === null}
      isFetching={isRefreshing && bundle !== null}
      skeleton={<DashboardSkeleton />}
    >
      <div className="space-y-6 pb-8 w-full max-w-full min-w-0 overflow-x-clip">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Inventory Operations Dashboard</h1>
            <p className="text-sm text-text-muted">Track stock health, sales movement, and team activity in one place.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="primary" iconName="FaPlus" onClick={handleNewProduct}>
              New Product
            </Button>
          </div>
        </div>

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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 w-full min-w-0">
          <section className="xl:col-span-2 rounded-2xl border border-border-muted bg-bg-light p-4 overflow-x-clip w-full max-w-full min-w-0">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-text uppercase tracking-wide">Low Stock Alert</h2>
              <Button variant="ghost" size="sm" iconName="FaListCheck" onClick={() => notify.info("Full list coming soon")}>
                View All
              </Button>
            </div>
            <div className="w-full min-w-0 overflow-x-clip">
              <table className="w-full table-fixed text-sm">
                <thead className="text-text-muted">
                  <tr className="border-b border-border-muted">
                    <th className="text-left py-2 w-2/5">Product</th>
                    <th className="text-left py-2 w-2/5">Category</th>
                    <th className="text-right py-2 w-1/10">Current</th>
                    <th className="text-right py-2 w-1/10">Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((item) => (
                    <tr key={item.id ?? `${item.name}-${item.qty}`} className="border-b border-border-muted/40 last:border-b-0">
                      <td className="py-2 font-medium text-text break-words pr-2">{item.name}</td>
                      <td className="py-2 text-text break-words pr-2">{item.category}</td>
                      <td className="py-2 text-right text-warning font-semibold">{item.qty}</td>
                      <td className="py-2 text-right text-text">{item.reorder}</td>
                    </tr>
                  ))}
                  {lowStock.length === 0 && (
                    <tr>
                      <td className="py-4 text-text-muted text-center" colSpan={4}>
                        No low stock items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-border-muted bg-bg-light p-4 overflow-x-clip w-full max-w-full min-w-0">
            <h2 className="text-sm font-semibold text-text uppercase tracking-wide mb-3">Recent Stock Movements</h2>
            <div className="space-y-3">
              {recentMovements.length === 0 ? (
                <div className="rounded-xl border border-border-muted bg-bg-main p-3 text-center">
                  <p className="text-sm text-text-muted">No stock movements recorded.</p>
                </div>
              ) : (
                recentMovements.map((movement, index) => (
                  <div key={`${movement.item}-${index}`} className="rounded-xl border border-border-muted bg-bg-main p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium text-text break-words flex-1">{movement.item}</p>
                      <span className="text-xs capitalize px-2 py-1 rounded-md bg-primary/15 text-primary shrink-0">
                        {movement.type}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1 break-words">
                      Qty: <span className="text-text">{movement.qty}</span> | By: {movement.by}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {limitedActivityLogs.length > 0 && (
          <section className="rounded-2xl border border-border-muted bg-bg-light p-4 overflow-x-clip w-full max-w-full min-w-0">
            <h2 className="text-sm font-semibold text-text uppercase tracking-wide mb-3">Recent Activity</h2>
            <div className="w-full min-w-0 overflow-x-clip">
              <table className="w-full table-fixed text-sm">
                <thead className="text-text-muted">
                  <tr className="border-b border-border-muted">
                    <th className="text-left py-2 w-1/4">Time</th>
                    <th className="text-left py-2 w-1/6">User</th>
                    <th className="text-left py-2 w-1/6">Action</th>
                    <th className="text-left py-2 w-2/5">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {limitedActivityLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border-muted/40 last:border-b-0">
                      <td className="py-2 text-text-muted break-words pr-2">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-2 text-text break-words pr-2">{log.user}</td>
                      <td className="py-2 break-words pr-2">
                        <span className="text-xs px-2 py-1 rounded-md bg-info/15 text-info font-semibold break-words inline-block">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2 text-text break-words">{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="rounded-2xl border border-border-muted bg-bg-light p-4 overflow-x-clip w-full max-w-full min-w-0">
          <h2 className="text-sm font-semibold text-text uppercase tracking-wide mb-3">Recently Added Products</h2>
          <div className="w-full min-w-0 overflow-x-clip">
            <table className="w-full table-fixed text-sm">
              <thead className="text-text-muted">
                <tr className="border-b border-border-muted">
                  <th className="text-left py-2 w-2/5">Name</th>
                  <th className="text-left py-2 w-2/5">Category</th>
                  <th className="text-right py-2 w-1/10">Stock</th>
                  <th className="text-right py-2 w-1/10">Price</th>
                </tr>
              </thead>
              <tbody>
                {latestProducts.map((product) => (
                  <tr key={`${product.name}-${product.createdAt}`} className="border-b border-border-muted/40 last:border-b-0">
                    <td className="py-2 font-medium text-text break-words pr-2">{product.name}</td>
                    <td className="py-2 text-text break-words pr-2">{product.category}</td>
                    <td className="py-2 text-right text-text">{product.qty}</td>
                    <td className="py-2 text-right text-text">₱{product.unitPrice.toFixed(2)}</td>
                  </tr>
                ))}
                {latestProducts.length === 0 && (
                  <tr>
                    <td className="py-4 text-text-muted text-center" colSpan={4}>
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );

  return (
    <MainLayout
      content={
        <>
          {body}

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

              <div className="md:col-span-1">
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

                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-text-muted">Need a new category?</p>
                  {!isAddingCategoryInline ? (
                    <Button
                      variant="outline"
                      size="sm"
                      iconName="FaPlus"
                      onClick={handleShowCategoryInlineForm}
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="FaXmark"
                      onClick={handleCancelCategoryInlineForm}
                    />
                  )}
                </div>
              </div>

              {isAddingCategoryInline && (
                <div className="md:col-span-2 rounded-2xl border border-border-muted bg-bg-main p-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-text">Add New Category</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      fullWidth
                      required
                      label="Category Name"
                      placeholder="Beverages"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <TextArea
                      fullWidth
                      label="Description"
                      placeholder="Optional category description."
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                    />

                    <div className="md:col-span-2 flex items-center justify-end gap-2">
                      <Button variant="secondary" onClick={handleCancelCategoryInlineForm}>
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        iconName="FaFloppyDisk"
                        onClick={handleSaveCategoryInline}
                        isLoading={isSavingCategory}
                        loadingText="Saving"
                      >
                        Save Category
                      </Button>
                    </div>
                  </div>
                </div>
              )}

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
        </>
      }
    />
  );

  return <MainLayout content={body} />;
};

export default Dashboard;