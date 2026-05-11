import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import MainLayout from "../../components/layouts/MainLayout";
import { Button, Modal } from "../../components/ui";
import { InputField, Select, TextArea } from "../../components/ui/forms";
import PurchaseOrderService from "../../services/PurchaseOrderService";
import ProductService from "../../services/ProductService";
import SupplierService, { type Supplier } from "../../services/SupplierService";
import { parseLaravelPage } from "../../util/parseLaravelPage";
import { notify } from "../../util/notify";

type PoLine = {
  id?: number;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  product?: { id: number; name: string };
};

type PurchaseOrderRow = {
  id: number;
  po_number: string;
  status: string;
  notes?: string | null;
  supplier?: { id: number; name: string };
  lines?: PoLine[];
  created_at: string;
};

type ProductPick = { id: number; name: string; sku: string; selling_price: number };

type LineForm = { product_id: string; quantity_ordered: string; unit_cost: string };

const PurchaseOrders = () => {
  const [rows, setRows] = useState<PurchaseOrderRow[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductPick[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineForm[]>([{ product_id: "", quantity_ordered: "1", unit_cost: "0" }]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const envelope = await PurchaseOrderService.list(page);
      const { items, meta: m } = parseLaravelPage<PurchaseOrderRow>(envelope);
      setRows(items);
      setMeta(m);
    } catch {
      notify.error("Unable to load purchase orders.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRefs = async () => {
    try {
      const supRes = (await SupplierService.getAll()) as { data?: Supplier[] };
      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
      const pr = (await ProductService.getAll()) as { data?: { items?: ProductPick[] } };
      const items = pr?.data?.items;
      setProducts(
        Array.isArray(items)
          ? items.map((p) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              selling_price: Number(p.selling_price ?? 0),
            }))
          : []
      );
    } catch {
      setSuppliers([]);
      setProducts([]);
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  useEffect(() => {
    void loadRefs();
  }, []);

  const openCreate = () => {
    setSupplierId("");
    setNotes("");
    setLines([{ product_id: "", quantity_ordered: "1", unit_cost: "0" }]);
    setModalOpen(true);
  };

  const addLine = () => setLines((prev) => [...prev, { product_id: "", quantity_ordered: "1", unit_cost: "0" }]);

  const updateLine = (index: number, patch: Partial<LineForm>) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeLine = (index: number) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const submitPo = async () => {
    const sid = Number(supplierId);
    if (!sid) {
      notify.warning("Select a supplier.");
      return;
    }
    const payloadLines = lines
      .map((l) => ({
        product_id: Number(l.product_id),
        quantity_ordered: Number(l.quantity_ordered),
        unit_cost: Number(l.unit_cost),
      }))
      .filter((l) => l.product_id && l.quantity_ordered > 0);
    if (!payloadLines.length) {
      notify.warning("Add at least one valid line item.");
      return;
    }
    setSaving(true);
    try {
      await PurchaseOrderService.create({
        supplier_id: sid,
        notes: notes.trim() || undefined,
        lines: payloadLines,
      });
      notify.success("Purchase order created.");
      setModalOpen(false);
      setPage(1);
      void load();
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      notify.error(err.response?.data?.message || "Create failed.");
    } finally {
      setSaving(false);
    }
  };

  const patchStatus = async (id: number, status: string) => {
    try {
      await PurchaseOrderService.update(id, { status });
      notify.success("Order updated.");
      void load();
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      notify.error(err.response?.data?.message || "Update failed.");
    }
  };

  const receive = async (id: number) => {
    if (!window.confirm("Receive all remaining quantities into stock?")) return;
    try {
      await PurchaseOrderService.receive(id);
      notify.success("Stock received.");
      void load();
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      notify.error(err.response?.data?.message || "Receive failed.");
    }
  };

  const content = (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Purchase orders</h1>
          <p className="text-sm text-text-muted">Create POs, approve, and receive into inventory.</p>
        </div>
        <Button variant="primary" iconName="FaPlus" onClick={openCreate}>
          New purchase order
        </Button>
      </div>

      <div className="rounded-2xl border border-border-muted bg-bg-light p-4 shadow-sm overflow-x-auto">
        {loading ? (
          <p className="text-sm text-text-muted py-8 text-center">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-text-muted">
              <tr className="border-b border-border-muted">
                <th className="text-left py-2">PO #</th>
                <th className="text-left py-2">Supplier</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Lines</th>
                <th className="text-left py-2">Created</th>
                <th className="text-right py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((po) => (
                <tr key={po.id} className="border-b border-border-muted/40 last:border-b-0">
                  <td className="py-2 font-mono text-xs font-semibold text-text">{po.po_number}</td>
                  <td className="py-2 text-text">{po.supplier?.name ?? "—"}</td>
                  <td className="py-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary font-bold uppercase">{po.status}</span>
                  </td>
                  <td className="py-2 text-text-muted">{po.lines?.length ?? 0}</td>
                  <td className="py-2 text-text-muted whitespace-nowrap">{new Date(po.created_at).toLocaleString()}</td>
                  <td className="py-2 text-right space-x-2 whitespace-nowrap">
                    {po.status === "pending" && (
                      <button type="button" className="text-xs font-bold uppercase text-primary hover:underline" onClick={() => void patchStatus(po.id, "approved")}>
                        Approve
                      </button>
                    )}
                    {(po.status === "pending" || po.status === "approved") && (
                      <button type="button" className="text-xs font-bold uppercase text-success hover:underline" onClick={() => void receive(po.id)}>
                        Receive
                      </button>
                    )}
                    {po.status !== "received" && po.status !== "canceled" && (
                      <button type="button" className="text-xs font-bold uppercase text-danger hover:underline" onClick={() => void patchStatus(po.id, "canceled")}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    No purchase orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {meta.last_page > 1 && (
          <div className="flex justify-between items-center mt-4 text-sm text-text-muted">
            <span>
              Page {meta.current_page} of {meta.last_page}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={meta.current_page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          if (!saving) setModalOpen(false);
        }}
        title="New purchase order"
        size="xl"
        primaryAction={{
          label: "Create PO",
          onClick: () => void submitPo(),
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
          <Select
            fullWidth
            label="Supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            options={[{ value: "", label: "Select supplier" }, ...suppliers.map((s) => ({ value: String(s.id), label: s.name }))]}
          />
          <TextArea fullWidth label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase text-text-muted tracking-wide">Line items</p>
            <Button type="button" variant="outline" size="sm" iconName="FaPlus" onClick={addLine}>
              Add line
            </Button>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end rounded-xl border border-border-muted p-3 bg-bg-main/40">
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
                        unit_cost: pr ? String(pr.selling_price) : line.unit_cost,
                      });
                    }}
                    options={[{ value: "", label: "Select product" }, ...products.map((p) => ({ value: String(p.id), label: `${p.sku} — ${p.name}` }))]}
                  />
                </div>
                <div className="md:col-span-2">
                  <InputField
                    fullWidth
                    label="Qty"
                    type="number"
                    min={1}
                    value={line.quantity_ordered}
                    onChange={(e) => updateLine(idx, { quantity_ordered: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3">
                  <InputField
                    fullWidth
                    label="Unit cost"
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unit_cost}
                    onChange={(e) => updateLine(idx, { unit_cost: e.target.value })}
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

export default PurchaseOrders;
