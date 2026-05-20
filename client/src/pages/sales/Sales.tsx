import { useEffect, useRef, useState, useMemo } from "react";
import type { AxiosError } from "axios";
import MainLayout from "../../components/layouts/MainLayout";
import { Button, Modal, LoadingSpinner } from "../../components/ui";
import { InputField, Select } from "../../components/ui/forms";
import { PageShell } from "../../components/page/PageShell";
import SaleService, { type CreateSalePayload } from "../../services/SaleService";
import ProductService from "../../services/ProductService";
import { parseLaravelPage } from "../../util/parseLaravelPage";
import { notify } from "../../util/notify";

type SaleRow = {
  id: number;
  sale_no: string;
  total: number;
  payment_method: string;
  status: string;
  customer?: { name: string } | null;
  created_at: string;
};

type ProductPick = { id: number; name: string; sku: string; selling_price: number };

type LineForm = { product_id: string; quantity: string; unit_price: string };

const paymentOptions: { value: CreateSalePayload["payment_method"]; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "gcash", label: "GCash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
];

const Sales = () => {
  // All sales (loaded once)
  const [allRows, setAllRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);

  // Client‑side pagination & search
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  // Reference data & modal state
  const [products, setProducts] = useState<ProductPick[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<CreateSalePayload["payment_method"]>("cash");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [lines, setLines] = useState<LineForm[]>([{ product_id: "", quantity: "1", unit_price: "0" }]);
  const [saving, setSaving] = useState(false);

  const finishedInitialRequest = useRef(false);

  // Fetch all sales (client‑side pagination)
  const loadAll = async () => {
    setLoading(true);
    try {
      // Fetch all pages sequentially
      let all: SaleRow[] = [];
      let currentPage = 1;
      let lastPage = 1;
      do {
        const envelope = await SaleService.list(currentPage);
        const { items, meta } = parseLaravelPage<SaleRow>(envelope);
        all.push(...items);
        lastPage = meta.last_page;
        currentPage++;
      } while (currentPage <= lastPage);
      setAllRows(all);
    } catch {
      notify.error("Unable to load sales.");
      setAllRows([]);
    } finally {
      setLoading(false);
      finishedInitialRequest.current = true;
    }
  };

  const loadProducts = async () => {
    try {
      const pr = await ProductService.getAll<ProductPick>();
      const items = pr?.data?.items;
      setProducts(
        Array.isArray(items)
          ? items.map((p) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              selling_price: Number((p as { selling_price?: number }).selling_price ?? (p as { unit_price?: number }).unit_price ?? 0),
            }))
          : []
      );
    } catch {
      setProducts([]);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    void loadProducts();
  }, []);

  // Client‑side filtering
  const filteredRows = useMemo(() => {
    if (!search.trim()) return allRows;
    const term = search.trim().toLowerCase();
    return allRows.filter(
      (sale) =>
        sale.sale_no.toLowerCase().includes(term) ||
        sale.payment_method.toLowerCase().includes(term) ||
        sale.status.toLowerCase().includes(term) ||
        (sale.customer?.name?.toLowerCase().includes(term))
    );
  }, [allRows, search]);

  const totalFiltered = filteredRows.length;
  const totalPages = Math.ceil(totalFiltered / rowsPerPage);
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const openCreate = () => {
    setPaymentMethod("cash");
    setDiscount("0");
    setTax("0");
    setLines([{ product_id: "", quantity: "1", unit_price: "0" }]);
    setModalOpen(true);
  };

  const addLine = () => setLines((prev) => [...prev, { product_id: "", quantity: "1", unit_price: "0" }]);

  const updateLine = (index: number, patch: Partial<LineForm>) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeLine = (index: number) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const submitSale = async () => {
    const payloadItems = lines
      .map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
      }))
      .filter((l) => l.product_id && l.quantity > 0 && l.unit_price >= 0);
    if (!payloadItems.length) {
      notify.warning("Add at least one line item.");
      return;
    }
    setSaving(true);
    try {
      await SaleService.create({
        payment_method: paymentMethod,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        items: payloadItems,
      });
      notify.success("Sale recorded.");
      setModalOpen(false);
      await loadAll(); // refresh the full list
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      notify.error(err.response?.data?.message || "Sale failed.");
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Sales</h1>
          <p className="text-sm text-text-muted">Record completed sales and deduct stock automatically.</p>
        </div>
        <Button variant="primary" iconName="FaPlus" onClick={openCreate}>
          New sale
        </Button>
      </div>

      <div className="rounded-2xl border border-border-muted bg-bg-light p-4 shadow-sm overflow-x-auto">
        {/* Search input */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between mb-4">
          <div className="flex-1 max-w-md">
            <InputField
              fullWidth
              label="Search sales"
              iconName="FaMagnifyingGlass"
              placeholder="Invoice, customer, payment, or status"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <PageShell
          isInitialLoading={loading && !finishedInitialRequest.current}
          isFetching={refetching}
          skeleton={
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          }
        >
          <>
            <table className="w-full text-sm">
              <thead className="text-text-muted">
                <tr className="border-b border-border-muted">
                  <th className="text-left py-2">Invoice</th>
                  <th className="text-left py-2">Customer</th>
                  <th className="text-left py-2">Payment</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((s) => (
                  <tr key={s.id} className="border-b border-border-muted/40 last:border-b-0">
                    <td className="py-2 font-mono text-xs font-semibold text-text">{s.sale_no}</td>
                    <td className="py-2 text-text">{s.customer?.name ?? "Walk-in"}</td>
                    <td className="py-2 text-text-muted capitalize">{s.payment_method.replace("_", " ")}</td>
                    <td className="py-2 text-right font-semibold text-text">₱{Number(s.total).toFixed(2)}</td>
                    <td className="py-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success font-bold uppercase">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2 text-text-muted whitespace-nowrap">{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {paginatedRows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-muted">
                      {search ? "No matching sales." : "No sales yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Client‑side pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-text-muted">
                <span>
                  Page {page} of {totalPages} ({totalFiltered} items)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        </PageShell>
      </div>

      {/* Modal unchanged */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          if (!saving) setModalOpen(false);
        }}
        title="New sale"
        size="xl"
        primaryAction={{
          label: "Complete sale",
          onClick: () => void submitSale(),
          isLoading: saving,
          loadingText: "Saving",
        }}
        secondaryAction={{
          label: "Close",
          onClick: () => {
            if (!saving) setModalOpen(false);
          },
          variant: "outline",
        }}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              fullWidth
              label="Payment method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as CreateSalePayload["payment_method"])}
              options={paymentOptions.map((o) => ({ value: o.value, label: o.label }))}
            />
            <InputField fullWidth label="Discount" type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <InputField fullWidth label="Tax" type="number" min={0} step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase text-text-muted tracking-wide">Line items</p>
            <Button type="button" variant="outline" size="sm" iconName="FaPlus" onClick={addLine}>
              Add line
            </Button>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end rounded-xl border border-border-muted p-3 bg-bg-main/40"
              >
                <div className="md:col-span-5">
                  <Select
                    fullWidth
                    label="Product"
                    value={line.product_id}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const pr = products.find((p) => String(p.id) === pid);
                      updateLine(idx, {
                        product_id: pid,
                        unit_price: pr ? String(pr.selling_price) : line.unit_price,
                      });
                    }}
                    options={[
                      { value: "", label: "Select product" },
                      ...products.map((p) => ({ value: String(p.id), label: `${p.sku} — ${p.name}` })),
                    ]}
                  />
                </div>
                <div className="md:col-span-2">
                  <InputField
                    fullWidth
                    label="Qty"
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3">
                  <InputField
                    fullWidth
                    label="Unit price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => updateLine(idx, { unit_price: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 flex justify-end pb-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(idx)} disabled={lines.length <= 1}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );

  return <MainLayout content={content} />;
};

export default Sales;