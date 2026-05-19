import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AxiosError } from "axios";
import { jsPDF } from "jspdf";

import MainLayout from "../../components/layouts/MainLayout";
import { Button, LoadingSpinner } from "../../components/ui";
import ReportService, { type ReportSummaryPayload } from "../../services/ReportService";
import { PageShell } from "../../components/page/PageShell";
import { notify } from "../../util/notify";

const dateInputValue = (value: Date) => {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const normalizeAiSummaryText = (input: string) => {
  return input
    .replace(/\u00A0/g, " ")
    .replace(/₱/g, "pesos")
    .replace(/±/g, "pesos")
    .split("\n")
    .map((line) => {
      const trimmed = line.replace(/\s+/g, " ").trim();

      if (!trimmed) return "";

      const tokens = trimmed.split(" ");
      const rebuilt: string[] = [];
      let letterRun: string[] = [];

      const flushRun = () => {
        if (letterRun.length > 0) {
          rebuilt.push(letterRun.join(""));
          letterRun = [];
        }
      };

      for (const token of tokens) {
        if (/^[A-Za-z]$/.test(token)) {
          letterRun.push(token);
        } else {
          flushRun();
          rebuilt.push(token);
        }
      }

      flushRun();

      return rebuilt.join(" ").replace(/\s+([.,;:!?])/g, "$1");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const Reports = () => {
  const initialFrom = dateInputValue(
    new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)
  );

  const initialTo = dateInputValue(new Date());

  const [draftFrom, setDraftFrom] = useState(initialFrom);
  const [draftTo, setDraftTo] = useState(initialTo);

  const [appliedRange, setAppliedRange] = useState({
    from: initialFrom,
    to: initialTo,
  });

  const [summary, setSummary] = useState<ReportSummaryPayload | null>(null);

  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);

  const finishedInitialRequest = useRef(false);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isAiDownloading, setIsAiDownloading] = useState(false);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const normalizedAiSummary = useMemo(
    () => (aiSummary ? normalizeAiSummaryText(aiSummary) : null),
    [aiSummary]
  );

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

        if (!cancelled) {
          setSummary(res?.data ?? null);
        }
      } catch (error) {
        const err = error as AxiosError<{ message?: string }>;

        if (!cancelled) {
          notify.error(
            err.response?.data?.message ||
              "Unable to load reports summary."
          );

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
      {
        label: "Total Products",
        value: `${kpis.products}`,
      },
      {
        label: "Total Suppliers",
        value: `${kpis.suppliers}`,
      },
      {
        label: "Low Stock Items",
        value: `${kpis.low_stock}`,
      },
      {
        label: "Sales Count",
        value: `${kpis.sales_count}`,
      },
      {
        label: "Sales Total",
        value: `₱${Number(kpis.sales_total).toFixed(2)}`,
      },
      {
        label: "Purchase Orders",
        value: `${kpis.purchase_count}`,
      },
      {
        label: "Stock In Qty",
        value: `${kpis.stock_in_qty}`,
      },
      {
        label: "Stock Out Qty",
        value: `${kpis.stock_out_qty}`,
      },
    ];
  }, [summary]);

  const applyRange = () => {
    if (!draftFrom || !draftTo) {
      notify.warning("Please select both dates.");
      return;
    }

    if (new Date(draftFrom) > new Date(draftTo)) {
      notify.warning("From date cannot be later than To date.");
      return;
    }

    setAppliedRange({
      from: draftFrom,
      to: draftTo,
    });
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

  const handleDownloadAiPdf = useCallback(async () => {
    if (!normalizedAiSummary) {
      notify.warning("No AI summary to download.");
      return;
    }

    setIsAiDownloading(true);

    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const title = "AI-Generated Business Summary";
      const subtitle = `Date Range: ${appliedRange.from} to ${appliedRange.to}`;
      const content = normalizedAiSummary;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text(title, 15, 20);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text(subtitle, 15, 30);

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const maxLineWidth = pageWidth - margin * 2;
      const lines = pdf.splitTextToSize(content ?? "", maxLineWidth);
      let cursorY = 40;

      pdf.setFontSize(10);
      for (const line of lines) {
        if (cursorY > pdf.internal.pageSize.getHeight() - 20) {
          pdf.addPage();
          cursorY = 20;
        }

        pdf.text(line, margin, cursorY);
        cursorY += 6;
      }

      pdf.save(`AI_Summary_${appliedRange.from}_to_${appliedRange.to}.pdf`);
      notify.success("AI Summary PDF downloaded.");
    } catch (error) {
      console.error("AI PDF generation failed:", error);
      notify.error("Failed to generate PDF.");
    } finally {
      setIsAiDownloading(false);
    }
  }, [normalizedAiSummary, appliedRange]);

  const fetchAiSummary = useCallback(async () => {
    setIsAiLoading(true);

    setAiSummary(null);
    setIsAiModalOpen(false);

    try {
      const response = await ReportService.aiDailySummary(
        appliedRange.from,
        appliedRange.to
      );

      const summaryText = response.data?.data?.summary || "";

      if (summaryText) {
        setAiSummary(summaryText);
        setIsAiModalOpen(true);

        notify.success("AI summary generated!");
      } else {
        notify.error("AI summary failed");
      }
    } catch (err) {
      console.error(err);

      notify.error("Could not reach AI service");
    } finally {
      setIsAiLoading(false);
    }
  }, [appliedRange.from, appliedRange.to]);

  const content = (
    <div className="space-y-6 pb-8 w-full max-w-full min-w-0 overflow-x-clip">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">
            Reports & Summaries
          </h1>

          <p className="text-sm text-text-muted">
            Review inventory, sales, and stock movement performance.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border-muted bg-bg-light p-4 shadow-sm">
        <div className="flex flex-col flex-wrap gap-3 lg:flex-row lg:items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              From
            </label>

            <input
              type="date"
              className="rounded-lg border border-border-muted bg-bg-main px-3 py-2 text-sm text-text outline-none"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              To
            </label>

            <input
              type="date"
              className="rounded-lg border border-border-muted bg-bg-main px-3 py-2 text-sm text-text outline-none"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
            />
          </div>

          <Button
            variant="primary"
            iconName="FaArrowsRotate"
            onClick={applyRange}
          >
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

          <Button
            variant="primary"
            iconName="FaRobot"
            isLoading={isAiLoading}
            loadingText="Asking AI..."
            onClick={fetchAiSummary}
          >
            AI Daily Summary
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
              <div
                key={card.label}
                className="rounded-2xl border border-border-muted bg-bg-light p-4 shadow-sm"
              >
                <p className="text-xs uppercase tracking-wide text-text-muted">
                  {card.label}
                </p>

                <p className="text-2xl font-bold text-text mt-2">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-8 w-full min-w-0">
            <section className="rounded-2xl border border-border-muted bg-bg-light p-4 overflow-x-clip w-full min-w-0">
              <h2 className="text-sm font-semibold text-text uppercase tracking-wide mb-3">
                Low Stock Summary
              </h2>

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
                      <tr
                        key={item.id}
                        className="border-b border-border-muted/40 last:border-b-0"
                      >
                        <td className="py-2 text-text-muted font-mono text-xs truncate pr-2">
                          {item.sku}
                        </td>

                        <td className="py-2 text-text font-medium truncate pr-2">
                          {item.name}
                        </td>

                        <td className="py-2 text-text-muted truncate pr-2">
                          {item.category}
                        </td>

                        <td className="py-2 text-right text-warning font-semibold">
                          {item.stock_quantity}
                        </td>
                      </tr>
                    ))}

                    {(summary?.low_stock_items?.length ?? 0) === 0 && (
                      <tr>
                        <td
                          className="py-4 text-text-muted text-center"
                          colSpan={4}
                        >
                          No low stock items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-border-muted bg-bg-light p-4 overflow-x-clip w-full min-w-0">
              <h2 className="text-sm font-semibold text-text uppercase tracking-wide mb-3">
                Recent Sales Summary
              </h2>

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
                      <tr
                        key={sale.id}
                        className="border-b border-border-muted/40 last:border-b-0"
                      >
                        <td className="py-2 text-text font-mono text-xs truncate pr-2">
                          {sale.sale_no}
                        </td>

                        <td className="py-2 text-text-muted truncate pr-2">
                          {sale.customer ?? "Walk-in"}
                        </td>

                        <td className="py-2 text-right text-text">
                          ₱{Number(sale.total).toFixed(2)}
                        </td>

                        <td className="py-2 text-text-muted capitalize">
                          {sale.status}
                        </td>
                      </tr>
                    ))}

                    {(summary?.recent_sales?.length ?? 0) === 0 && (
                      <tr>
                        <td
                          className="py-4 text-text-muted text-center"
                          colSpan={4}
                        >
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

      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border-muted bg-bg-light shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-muted px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-text">
                  AI-Generated Business Summary
                </h2>

                <p className="text-xs text-text-muted">
                  Daily summary from your n8n workflow
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="rounded-lg px-3 py-1 text-sm font-semibold text-text-muted hover:bg-bg-main hover:text-text"
              >
                Close
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border-muted bg-bg-main p-4 text-sm leading-7 text-text whitespace-pre-wrap break-words">
                {normalizedAiSummary?.trim() ||
                  "No AI summary available."}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border-muted px-5 py-4">
              <Button
                type="button"
                variant="outline"
                iconName="FaFilePdf"
                isLoading={isAiDownloading}
                loadingText="Generating..."
                onClick={() => void handleDownloadAiPdf()}
              >
                Download AI PDF
              </Button>

              <Button
                variant="primary"
                onClick={() => setIsAiModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return <MainLayout content={content} />;
};

export default Reports;