import { useEffect, useRef, useState } from "react";
import type { AxiosError } from "axios";
import MainLayout from "../../components/layouts/MainLayout";
import { Button, LoadingSpinner, Modal } from "../../components/ui";
import { InputField, Select, TextArea } from "../../components/ui/forms";
import CategoryService, { type Category } from "../../services/CategoryService";
import ProductService from "../../services/ProductService";
import { useDebounce } from "../../hooks";
import { notify } from "../../util/notify";
import { PageShell } from "../../components/page/PageShell";

type ProductRow = {
  id: number;
  sku: string;
  name: string;
  category: string;
  stock_quantity: number;
  reorder_level: number;
  selling_price: number;
  low_stock?: boolean;
  notes?: string | null;
};

type ListMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type EditProductFormState = {
  name: string;
  category: string;
  sku: string;
  selling_price: string;
  reorder_level: string;
  notes: string;
};

type CategoryFormState = {
  name: string;
  description: string;
};

const emptyMeta: ListMeta = { current_page: 1, last_page: 1, per_page: 15, total: 0 };

const emptyCategoryForm: CategoryFormState = { name: "", description: "" };

const Products = () => {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [meta, setMeta] = useState<ListMeta>(emptyMeta);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const finishedInitialRequest = useRef(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [editForm, setEditForm] = useState<EditProductFormState>({
    name: "",
    category: "",
    sku: "",
    selling_price: "",
    reorder_level: "",
    notes: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await CategoryService.getAll();
      setCategories(Array.isArray(res?.data) ? res.data : []);
    } catch {
      notify.error("Unable to load categories.");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const isFirstLoad = !finishedInitialRequest.current;

    const run = async () => {
      if (isFirstLoad) setLoading(true);
      else setIsRefetching(true);

      try {
        const res = (await ProductService.list({
          search: debounced.trim() || undefined,
          page,
          per_page: 15,
          sort: "created_at",
          direction: "desc",
        })) as {
          data?: { items?: ProductRow[]; meta?: ListMeta };
        };

        if (cancelled) return;

        const payload = res?.data;
        const nextRows = Array.isArray(payload?.items) ? payload.items : [];
        setRows(nextRows);
        setMeta(payload?.meta ?? emptyMeta);
      } catch {
        if (!cancelled) {
          notify.error("Unable to load products.");
          setRows([]);
          setMeta(emptyMeta);
        }
      } finally {
        if (!cancelled) {
          finishedInitialRequest.current = true;
          setLoading(false);
          setIsRefetching(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [page, debounced, refreshKey]);

  const openEditModal = (product: ProductRow) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name ?? "",
      category: product.category ?? "",
      sku: product.sku ?? "",
      selling_price: String(product.selling_price ?? ""),
      reorder_level: String(product.reorder_level ?? ""),
      notes: product.notes ?? "",
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (isSavingEdit) return;
    setIsEditModalOpen(false);
    setEditingProduct(null);
    setEditForm({
      name: "",
      category: "",
      sku: "",
      selling_price: "",
      reorder_level: "",
      notes: "",
    });
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    const requiredFields = [
      editForm.name.trim(),
      editForm.category.trim(),
      editForm.sku.trim(),
      editForm.selling_price.trim(),
      editForm.reorder_level.trim(),
    ];

    if (requiredFields.some((value) => !value)) {
      notify.warning("Please complete all required fields.");
      return;
    }

    const sellingPrice = Number(editForm.selling_price);
    const reorderLevel = Number(editForm.reorder_level);

    if ([sellingPrice, reorderLevel].some((value) => Number.isNaN(value) || value < 0)) {
      notify.warning("Price and reorder level must be valid positive numbers.");
      return;
    }

    setIsSavingEdit(true);

    try {
      await ProductService.update(editingProduct.id, {
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        sku: editForm.sku.trim(),
        selling_price: sellingPrice,
        reorder_level: reorderLevel,
        notes: editForm.notes.trim() || undefined,
      });

      notify.success(`Product "${editForm.name}" updated.`);
      setIsEditModalOpen(false);
      setEditingProduct(null);
      await Promise.all([setRefreshKey((k) => k + 1)]);
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notify.error(axiosError.response?.data?.message || "Unable to update product.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description ?? "",
    });
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    if (isSavingCategory) return;
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
  };

  const handleSaveCategory = async () => {
    const name = categoryForm.name.trim();
    if (!name) {
      notify.warning("Category name is required.");
      return;
    }

    setIsSavingCategory(true);
    try {
      if (editingCategory) {
        await CategoryService.update(editingCategory.id, {
          name,
          description: categoryForm.description.trim() || undefined,
        });
        notify.success(`Category "${name}" updated.`);
      } else {
        await CategoryService.create({
          name,
          description: categoryForm.description.trim() || undefined,
        });
        notify.success(`Category "${name}" created.`);
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryForm(emptyCategoryForm);
      await loadCategories();
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      notify.error(axiosError.response?.data?.message || "Unable to save category.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!window.confirm(`Delete category "${name}"? Products using it may need reassignment.`)) return;

    try {
      await CategoryService.delete(id);
      notify.success("Category deleted.");
      await loadCategories();
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      notify.error(err.response?.data?.message || "Unable to delete category.");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Permanently delete "${name}"? This action cannot be undone.`)) return;

    try {
      await ProductService.permanentDelete(id);
      notify.success("Product permanently deleted.");
      setRefreshKey((k) => k + 1);
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      notify.error(err.response?.data?.message || "Delete failed.");
    }
  };

  const content = (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Products</h1>
          <p className="text-sm text-text-muted">Search products and manage product details.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border-muted bg-bg-light p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between mb-4">
          <div className="flex-1 max-w-md">
            <InputField
              fullWidth
              label="Search"
              iconName="FaMagnifyingGlass"
              placeholder="SKU, name, or barcode"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Button variant="outline" iconName="FaArrowRotateRight" onClick={() => setRefreshKey((k) => k + 1)}>
            Refresh
          </Button>
        </div>

        <PageShell
          isInitialLoading={loading && !finishedInitialRequest.current}
          isFetching={isRefetching}
          skeleton={
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          }
        >
          <div className="w-full overflow-hidden">
            <table className="w-full text-sm table-auto">
              <thead className="text-text-muted">
                <tr className="border-b border-border-muted">
                  <th className="text-left py-2 px-2">SKU</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Category</th>
                  <th className="text-right py-2 px-2">Price</th>
                  <th className="text-right py-2 px-2">Stock</th>
                  <th className="text-right py-2 px-2">Reorder</th>
                  <th className="text-right py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border-muted/40 last:border-b-0">
                    <td className="py-2 px-2 font-mono text-xs text-text">{p.sku}</td>
                    <td className="py-2 px-2 font-medium text-text">{p.name}</td>
                    <td className="py-2 px-2 text-text-muted">{p.category}</td>
                    <td className="py-2 px-2 text-right text-text">₱{Number(p.selling_price).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-semibold text-text">{p.stock_quantity}</td>
                    <td className="py-2 px-2 text-right text-text-muted">{p.reorder_level}</td>
                    <td className="py-2 px-2 text-right">
                      {p.low_stock ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-warning/15 text-warning font-bold">Low</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success font-bold">OK</span>
                      )}
                    </td>

                    <td className="py-2 px-2 text-right">
                      <div className="flex flex-wrap gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          iconName="FaPen"
                          tooltip="Edit product"
                          tooltipPosition="top"
                          onClick={() => openEditModal(p)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          iconName="FaTrash"
                          tooltip="Permanent delete product"
                          tooltipPosition="top"
                          className="text-danger border-danger hover:bg-danger hover:text-bg-dark"
                          onClick={() => void handleDelete(p.id, p.name)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-text-muted">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PageShell>

        {meta.last_page > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-text-muted">
            <span>
              Page {meta.current_page} of {meta.last_page} ({meta.total} items)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.current_page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border-muted bg-bg-light p-4 shadow-sm">
        <motionlessCategoriesHeader onAdd={openCreateCategoryModal} />

        <PageShell
          isInitialLoading={categoriesLoading}
          isFetching={false}
          skeleton={
            <motionlessCategoriesSkeleton />
          }
        >
          <div className="w-full overflow-hidden">
            <table className="w-full text-sm table-auto">
              <thead className="text-text-muted">
                <tr className="border-b border-border-muted">
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Description</th>
                  <th className="text-right py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-border-muted/40 last:border-b-0">
                    <td className="py-2 px-2 font-medium text-text">{category.name}</td>
                    <td className="py-2 px-2 text-text-muted">{category.description || "—"}</td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex flex-wrap gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          iconName="FaPen"
                          tooltip="Edit category"
                          tooltipPosition="top"
                          onClick={() => openEditCategoryModal(category)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          iconName="FaTrash"
                          tooltip="Delete category"
                          tooltipPosition="top"
                          className="text-danger border-danger hover:bg-danger hover:text-bg-dark"
                          onClick={() => void handleDeleteCategory(category.id, category.name)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}

                {categories.length === 0 && !categoriesLoading && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-text-muted">
                      No categories yet. Add one to organize products.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PageShell>
      </div>

      <Modal
        isOpen={isCategoryModalOpen}
        onClose={closeCategoryModal}
        title={editingCategory ? "Edit Category" : "New Category"}
        size="md"
        primaryAction={{
          label: editingCategory ? "Save Changes" : "Create Category",
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
            value={categoryForm.name}
            onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <TextArea
            fullWidth
            label="Description"
            placeholder="Optional description"
            value={categoryForm.description}
            onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit Product"
        size="lg"
        primaryAction={{
          label: "Save Changes",
          iconName: "FaFloppyDisk",
          onClick: handleUpdateProduct,
          isLoading: isSavingEdit,
          loadingText: "Saving",
        }}
        secondaryAction={{
          label: "Cancel",
          variant: "secondary",
          onClick: closeEditModal,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            fullWidth
            required
            label="Product Name"
            placeholder="Canned Tuna 155g"
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
          />

          <Select
            fullWidth
            required
            label="Category"
            value={editForm.category}
            onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
            options={[
              { value: "", label: "Select category" },
              ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
            ]}
          />

          <InputField
            fullWidth
            required
            label="SKU"
            placeholder="PRD-123456"
            value={editForm.sku}
            onChange={(e) => setEditForm((prev) => ({ ...prev, sku: e.target.value }))}
          />

          <InputField
            fullWidth
            required
            type="number"
            min="0"
            step="0.01"
            label="Selling Price"
            placeholder="0.00"
            value={editForm.selling_price}
            onChange={(e) => setEditForm((prev) => ({ ...prev, selling_price: e.target.value }))}
          />

          <InputField
            fullWidth
            required
            type="number"
            min="0"
            step="1"
            label="Reorder Level"
            placeholder="0"
            value={editForm.reorder_level}
            onChange={(e) => setEditForm((prev) => ({ ...prev, reorder_level: e.target.value }))}
          />

          <div className="md:col-span-2">
            <TextArea
              fullWidth
              label="Notes"
              placeholder="Optional product notes."
              value={editForm.notes}
              onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );

  return <MainLayout content={content} />;
};

function motionlessCategoriesHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div>
        <h2 className="text-lg font-bold text-text">Categories</h2>
        <p className="text-sm text-text-muted">Create, edit, and delete product categories.</p>
      </div>
      <Button variant="primary" iconName="FaPlus" onClick={onAdd}>
        Add Category
      </Button>
    </div>
  );
}

function motionlessCategoriesSkeleton() {
  return (
    <div className="flex justify-center py-8">
      <LoadingSpinner size="md" />
    </div>
  );
}

export default Products;