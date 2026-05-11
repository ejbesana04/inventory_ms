import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import MainLayout from "../../components/layouts/MainLayout";
import { Button } from "../../components/ui";
import { InputField, Select } from "../../components/ui/forms";
import ProductService from "../../services/ProductService";
import StockService from "../../services/StockService";
import { notify } from "../../util/notify";

type ProductOption = { id: number; name: string; sku: string };

const StockIn = () => {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("Stock in");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const res = (await ProductService.getAll()) as { data?: { items?: ProductOption[] } };
        const items = res?.data?.items;
        setProducts(Array.isArray(items) ? items.map((p) => ({ id: p.id, name: p.name, sku: p.sku })) : []);
      } catch {
        setProducts([]);
      }
    };
    void run();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = Number(productId);
    const qty = Number(quantity);
    if (!pid || !qty) {
      notify.warning("Select a product and enter quantity.");
      return;
    }
    setLoading(true);
    try {
      await StockService.record({
        product_id: pid,
        movement_type: "in",
        quantity: qty,
        reason: reason.trim() || "Stock in",
      });
      notify.success("Stock in recorded.");
      setQuantity("1");
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      notify.error(err.response?.data?.message || "Unable to record stock in.");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="max-w-lg space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-text">Stock In</h1>
        <p className="text-sm text-text-muted mt-1">Receive inventory against a product SKU.</p>
      </div>
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border-muted bg-bg-light p-6 space-y-4 shadow-sm">
        <Select
          fullWidth
          label="Product"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          options={[
            { value: "", label: "Select product" },
            ...products.map((p) => ({ value: String(p.id), label: `${p.sku} — ${p.name}` })),
          ]}
        />
        <InputField label="Quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} fullWidth />
        <InputField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth />
        <Button type="submit" variant="primary" isLoading={loading} loadingText="Saving">
          Record stock in
        </Button>
      </form>
    </div>
  );

  return <MainLayout content={content} />;
};

export default StockIn;
