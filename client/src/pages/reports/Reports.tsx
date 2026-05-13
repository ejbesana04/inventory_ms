import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AxiosError } from "axios";
import MainLayout from "../../components/layouts/MainLayout";
import { Button, LoadingSpinner } from "../../components/ui";
import ReportService, { type ReportSummaryPayload } from "../../services/ReportService";
import { PageShell } from "../../components/page/PageShell";
import { notify } from "../../util/notify";

const dateInputValue = (value: Date) => value.toISOString().slice(0, 10);

const Reports = () => {
  const initialFrom = dateInputValue(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30));
  const initialTo = dateInputValue(new Date());

  const [draftFrom, setDraftFrom] = useState(initialFrom);
  const [draftTo, setDraftTo] = useState(initialTo);
  const [appliedRange, setAppliedRange] = useState({ from: initialFrom, to: initialTo });
  const [summary, setSummary] = useState<ReportSummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const finishedInitialRequest = useRef(false);

  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const isFirst = !finishedInitialRequest.current;

    const run = async () => {
      if (isFirst) setLoading(true);
      else setIsRefetching(true);
      try {
        const res = (await ReportService.getSummary({
          from: appliedRange.from,
          to: appliedRange.to,
        })) as { data?: ReportSummaryPayload };
        if (!cancelled) setSummary(res?.data ?? null);
      } catch (error) {
        const err = error as AxiosError<{ message?: string }>;
        if (!cancelled) {
          notify.error(err.response?.data?.message || "Unable to load reports summary.");
          setSummary(null);
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
  }, [appliedRange.from, appliedRange.to]);

  const cards = useMemo(() => {
    const kpis = summary?.kpis;
    if (!kpis) return [];
    return [
      { label: "Total Products", value: `${kpis.products}` },
      { label: "Total Suppliers", value: `${kpis.suppliers}` },
      { label: "Low Stock Items", value: `${kpis.low_stock}` },
      { label: "Sales Count", value: `${kpis.sales_count}` },
      { label: "Sales Total", value: `P${Number(kpis.sales_total).toFixed(2)}` },
      { label: "Purchase Orders", value: `${kpis.purchase_count}` },
      { label: "Stock In Qty", value: `${kpis.stock_in_qty}` },
      { label: "Stock Out Qty", value: `${kpis.stock_out_qty}` },
    ];
  }, [summary]);

  const applyRange = () => {
    setAppliedRange({ from: draftFrom, to: draftTo });
  };

  const handleDownloadPdf = useCallback(async () => {
    if (!appliedRange.from || !appliedRange.to) {
      notify.warning("Select a valid date range first.");
      return;
    }
    setIsDownloading(true);
    try {
      await ReportService.downloadSummaryPdf({
        from: appliedRange.from,
        to: appliedRange.to,
      });
      notify.success("PDF report downloaded.");
    } catch (error) {
      const err = error as Error;
      notify.error(err.message || "PDF download failed.");
    } finally {
      setIsDownloading(false);
    }
  }, [appliedRange.from, appliedRange.to]);

  const content = (
    <div className="space-y-6 pb-8 w-full max-w-full min-w-0 overflow-x-clip">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Reports & Summaries</h1>
          <p className="text-sm text-text-muted">Review inventory, sales, and stock movement performance.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border-muted bg-bg-light p-4 shadow-sm">
        <div className="flex flex-col flex-wrap gap-3 lg:flex-row lg:items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">From</label>
            <input
              type="date"
              className="rounded-lg border border-border-muted bg-bg-main px-3 py-2 text-sm text-text outline-none"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">To</label>
            <input
              type="date"
              className="rounded-lg border border-border-muted bg-bg-main px-3 py-2 text-sm text-text outline-none"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
            />
          </div>
          <Button variant="primary" iconName="FaArrowsRotate" onClick={applyRange}>
            Apply Range
          </Button>
          <Button
            type="button"
            variant="outline"
            iconName="FaFilePdf"
            isLoading={isDownloading}
            loadingText="Preparing"
            onClick={() => void handleDownloadPdf()}
          >
            Download PDF
          </Button>
        </div>
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full min-w-0">
            {cards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-border-muted bg-bg-light p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-text-muted">{card.label}</p>
                <p className="text-2xl font-bold text-text mt-2">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full min-w-0">
            <section className="rounded-2xl border border-border-muted bg-bg-light p-4 overflow-x-clip w-full min-w-0">
              <h2 className="text-sm font-semibold text-text uppercase tracking-wide mb-3">Low Stock Summary</h2>
              <div className="w-full min-w-0 overflow-x-clip">
                <table className="w-full table-fixed text-sm">
                  <thead className="text-text-muted">
                    <tr className="border-b border-border-muted">
                      <th className="text-left py-2 w-1/4">SKU</th>
                      <th className="text-left py-2 w-2/5">Product</th>
                      <th className="text-left py-2 w-1/4">Category</th>
                      <th className="text-right py-2 w-1/12">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary?.low_stock_items ?? []).map((item) => (
                      <tr key={item.id} className="border-b border-border-muted/40 last:border-b-0">
                        <td className="py-2 text-text-muted font-mono text-xs truncate pr-2">{item.sku}</td>
                        <td className="py-2 text-text font-medium truncate pr-2">{item.name}</td>
                        <td className="py-2 text-text-muted truncate pr-2">{item.category}</td>
                        <td className="py-2 text-right text-warning font-semibold">{item.stock_quantity}</td>
                      </tr>
                    ))}
                    {(summary?.low_stock_items?.length ?? 0) === 0 && (
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

            <section className="rounded-2xl border border-border-muted bg-bg-light p-4 overflow-x-clip w-full min-w-0">
              <h2 className="text-sm font-semibold text-text uppercase tracking-wide mb-3">Recent Sales Summary</h2>
              <div className="w-full min-w-0 overflow-x-clip">
                <table className="w-full table-fixed text-sm">
                  <thead className="text-text-muted">
                    <tr className="border-b border-border-muted">
                      <th className="text-left py-2 w-1/4">Sale No</th>
                      <th className="text-left py-2 w-1/3">Customer</th>
                      <th className="text-right py-2 w-1/5">Total</th>
                      <th className="text-left py-2 w-1/5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary?.recent_sales ?? []).map((sale) => (
                      <tr key={sale.id} className="border-b border-border-muted/40 last:border-b-0">
                        <td className="py-2 text-text font-mono text-xs truncate pr-2">{sale.sale_no}</td>
                        <td className="py-2 text-text-muted truncate pr-2">{sale.customer ?? "Walk-in"}</td>
                        <td className="py-2 text-right text-text">P{Number(sale.total).toFixed(2)}</td>
                        <td className="py-2 text-text-muted capitalize">{sale.status}</td>
                      </tr>
                    ))}
                    {(summary?.recent_sales?.length ?? 0) === 0 && (
                      <tr>
                        <td className="py-4 text-text-muted text-center" colSpan={4}>
                          No sales in selected range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      </PageShell>
    </div>
  );

  return <MainLayout content={content} />;
};

export default Reports;
