import { useEffect, useRef, useState, useMemo } from "react";
import type { AxiosError } from "axios";
import MainLayout from "../../components/layouts/MainLayout";
import { Button, Modal, LoadingSpinner } from "../../components/ui";
import { InputField, TextArea } from "../../components/ui/forms";
import { PageShell } from "../../components/page/PageShell";
import SupplierService, { type Supplier } from "../../services/SupplierService";
import { notify } from "../../util/notify";

const emptyForm = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  is_active: true,
};

const Suppliers = () => {
  // All suppliers (loaded once)
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);

  // Client‑side pagination state
  const [supplierSearch, setSupplierSearch] = useState("");
  const [page, setPage] = useState(1);
  const suppliersPerPage = 10;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const finishedInitialRequest = useRef(false);

  // Load all suppliers once
  const loadAllSuppliers = async () => {
    setLoading(true);
    try {
      const res = (await SupplierService.getAll()) as { data?: Supplier[] };
      setAllSuppliers(Array.isArray(res?.data) ? res.data : []);
    } catch {
      notify.error("Unable to load suppliers.");
      setAllSuppliers([]);
    } finally {
      setLoading(false);
      finishedInitialRequest.current = true;
    }
  };

  useEffect(() => {
    void loadAllSuppliers();
  }, []);

  // Client‑side filtering
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return allSuppliers;
    const term = supplierSearch.trim().toLowerCase();
    return allSuppliers.filter((s) =>
      s.name.toLowerCase().includes(term) ||
      (s.contact_person?.toLowerCase().includes(term)) ||
      (s.email?.toLowerCase().includes(term))
    );
  }, [allSuppliers, supplierSearch]);

  const totalFiltered = filteredSuppliers.length;
  const totalPages = Math.ceil(totalFiltered / suppliersPerPage);
  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * suppliersPerPage;
    return filteredSuppliers.slice(start, start + suppliersPerPage);
  }, [filteredSuppliers, page]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [supplierSearch]);

  // CRUD helpers (no change from original, but after save/delete we reload all suppliers)
  const refreshSuppliers = () => {
    void loadAllSuppliers();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      contact_person: s.contact_person ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      is_active: s.is_active !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const save = async () => {
    const name = form.name.trim();
    if (!name) {
      notify.warning("Supplier name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        contact_person: form.contact_person.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        is_active: form.is_active,
      };
      if (editingId) {
        await SupplierService.update(editingId, payload);
        notify.success("Supplier updated.");
      } else {
        await SupplierService.create(payload);
        notify.success("Supplier created.");
      }
      closeModal();
      await refreshSuppliers();
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      notify.error(err.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: Supplier) => {
    if (!window.confirm(`Remove supplier "${s.name}"? This cannot be undone if linked data exists.`)) return;
    try {
      await SupplierService.delete(s.id);
      notify.success("Supplier removed.");
      await refreshSuppliers();
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      notify.error(err.response?.data?.message || "Delete failed.");
    }
  };

  const content = (
    <div className="space-y-6 pb-8 overflow-x-hidden max-w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Suppliers</h1>
          <p className="text-sm text-text-muted">Vendors linked to products and purchase orders.</p>
        </div>
        <Button variant="primary" iconName="FaPlus" onClick={openCreate}>
          Add supplier
        </Button>
      </div>

      <div className="rounded-2xl border border-border-muted bg-bg-light p-4 shadow-sm overflow-x-hidden">
        {/* Search input */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between mb-4">
          <div className="flex-1 max-w-md">
            <InputField
              fullWidth
              label="Search suppliers"
              iconName="FaMagnifyingGlass"
              placeholder="Name, contact, or email"
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
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
          <div className="w-full overflow-x-hidden">
            <table className="w-full table-fixed text-sm">
              <thead className="text-text-muted">
                <tr className="border-b border-border-muted">
                  <th className="text-left py-2 w-1/5">Name</th>
                  <th className="text-left py-2 w-1/6">Contact</th>
                  <th className="text-left py-2 w-1/6">Phone</th>
                  <th className="text-left py-2 w-1/5">Email</th>
                  <th className="text-left py-2 w-1/4">Address</th>
                  <th className="text-left py-2 w-1/12">Status</th>
                  <th className="text-right py-2 w-1/12">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSuppliers.map((s) => (
                  <tr key={s.id} className="border-b border-border-muted/40 last:border-b-0">
                    <td className="py-2 font-medium text-text break-words pr-2">{s.name}</td>
                    <td className="py-2 text-text break-words pr-2">{s.contact_person || "—"}</td>
                    <td className="py-2 text-text break-words pr-2">{s.phone || "—"}</td>
                    <td className="py-2 text-text break-words pr-2">{s.email || "—"}</td>
                    <td className="py-2 text-text break-words pr-2">{s.address || "—"}</td>
                    <td className="py-2 break-words pr-2">
                      {s.is_active === false ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-border-muted text-text-muted font-bold">Inactive</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success font-bold">Active</span>
                      )}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="text-primary font-bold text-xs uppercase hover:underline mr-2"
                        onClick={() => openEdit(s)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-danger font-bold text-xs uppercase hover:underline"
                        onClick={() => void remove(s)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedSuppliers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-muted">
                      {supplierSearch ? "No matching suppliers found." : "No suppliers yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination - same style as Products.tsx product table */}
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
          </div>
        </PageShell>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit supplier" : "New supplier"}
        size="lg"
        primaryAction={{
          label: editingId ? "Save changes" : "Create supplier",
          onClick: () => void save(),
          isLoading: saving,
          loadingText: "Saving",
          variant: "primary",
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: closeModal,
          variant: "outline",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField fullWidth label="Company name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <InputField
            fullWidth
            label="Contact person"
            value={form.contact_person}
            onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
          />
          <InputField fullWidth label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <InputField fullWidth type="email" label="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <div className="md:col-span-2">
            <TextArea
              fullWidth
              label="Address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={2}
            />
          </div>
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-text cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-border-muted"
            />
            <span>Active supplier</span>
          </label>
        </div>
      </Modal>
    </div>
  );

  return <MainLayout content={content} />;
};

export default Suppliers;