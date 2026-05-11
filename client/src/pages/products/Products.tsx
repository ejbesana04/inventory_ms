import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import MainLayout from "../../components/layouts/MainLayout";
import { Button, Icon, LoadingSpinner } from "../../components/ui";
import { InputField } from "../../components/ui/forms";
import ProductService from "../../services/ProductService";
import { useDebounce } from "../../hooks";
import { notify } from "../../util/notify";

type ProductRow = {
  id: number;
  sku: string;
  name: string;
  category: string;
  stock_quantity: number;
  reorder_level: number;
  selling_price: number;
  low_stock?: boolean;
  deleted_at?: string | null;
};

const Products = () => {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [catalogTab, setCatalogTab] = useState<"active" | "archived">("active");

  const load = async (tabOverride?: "active" | "archived", pageOverride?: number) => {
    const tab = tabOverride ?? catalogTab;
    const listPage = pageOverride ?? page;
    setLoading(true);
    try {
      const res = (await ProductService.list({
        search: debounced.trim() || undefined,
        page: listPage,
        per_page: 15,
        sort: "created_at",
        direction: "desc",
        ...(tab === "archived" ? { filter: "archived" as const } : {}),
      })) as {
        data?: { items?: ProductRow[]; meta?: typeof meta };
      };
      const payload = res?.data;
      setRows(Array.isArray(payload?.items) ? payload!.items! : []);
      if (payload?.meta) {
        setMeta(payload.meta);
      }
    } catch {
      notify.error("Unable to load products.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, debounced, catalogTab]);

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Archive product "${name}"? It will be hidden from active lists and sales picks.`)) return;
    try {
      await ProductService.remove(id);
      notify.success("Product archived.");
      void load();
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      notify.error(err.response?.data?.message || "Delete failed.");
    }
  };

  const handleRestore = async (id: number, name: string) => {
    if (!window.confirm(`Restore product "${name}" to the active catalog?`)) return;
    try {
      await ProductService.restore(id);
      notify.success("Product restored.");
      setCatalogTab("active");
      setPage(1);
      void load("active", 1);
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      notify.error(err.response?.data?.message || "Restore failed.");
    }
  };

  const content = (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Products</h1>
          <p className="text-sm text-text-muted">Search, review stock health, archive (soft delete), or restore SKUs.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={catalogTab === "active" ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setCatalogTab("active");
            setPage(1);
          }}
        >
          Active
        </Button>
        <Button
          type="button"
          variant={catalogTab === "archived" ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setCatalogTab("archived");
            setPage(1);
          }}
        >
          Archived
        </Button>
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
          <Button variant="outline" iconName="FaArrowRotateRight" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-text-muted">
                <tr className="border-b border-border-muted">
                  <th className="text-left py-2">SKU</th>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Category</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Stock</th>
                  <th className="text-right py-2">Reorder</th>
                  <th className="text-right py-2">Status</th>
                  {catalogTab === "archived" && <th className="text-left py-2">Archived</th>}
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border-muted/40 last:border-b-0">
                    <td className="py-2 font-mono text-xs text-text">{p.sku}</td>
                    <td className="py-2 font-medium text-text">{p.name}</td>
                    <td className="py-2 text-text-muted">{p.category}</td>
                    <td className="py-2 text-right text-text">₱{Number(p.selling_price).toFixed(2)}</td>
                    <td className="py-2 text-right font-semibold text-text">{p.stock_quantity}</td>
                    <td className="py-2 text-right text-text-muted">{p.reorder_level}</td>
                    <td className="py-2 text-right">
                      {catalogTab === "archived" ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-text-muted/15 text-text-muted font-bold">Archived</span>
                      ) : p.low_stock ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-warning/15 text-warning font-bold">Low</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success font-bold">OK</span>
                      )}
                    </td>
                    {catalogTab === "archived" && (
                      <td className="py-2 text-text-muted whitespace-nowrap text-xs">
                        {p.deleted_at ? new Date(p.deleted_at).toLocaleString() : "—"}
                      </td>
                    )}
                    <td className="py-2 text-right">
                      {catalogTab === "archived" ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-bold uppercase text-success hover:underline"
                          onClick={() => void handleRestore(p.id, p.name)}
                        >
                          <Icon iconName="FaRotateLeft" size={14} /> Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-bold uppercase text-danger hover:underline"
                          onClick={() => void handleDelete(p.id, p.name)}
                        >
                          <Icon iconName="FaTrash" size={14} /> Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={catalogTab === "archived" ? 9 : 8} className="py-8 text-center text-text-muted">
                      {catalogTab === "archived" ? "No archived products." : "No products found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

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
    </div>
  );

  return <MainLayout content={content} />;
};

export default Products;
