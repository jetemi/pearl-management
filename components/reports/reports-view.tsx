"use client";

import { exportToCSV, formatCurrency, type DieselPoolTotals } from "@/lib/utils";

interface DieselReportRow {
  flat_number: string;
  owner_name: string;
  dieselOnGenerator: boolean;
  paidCurrentCycle: number;
  totalExpected: number;
  totalPaid: number;
  balance: number;
  owedCycles: number;
  aheadCycles: number;
  dieselNotApplicable: boolean;
}

interface ServiceChargePeriodReport {
  period: { id: string; period_label: string; amount_per_unit: number };
  unitStatuses: {
    flat_number: string;
    owner_name: string;
    paid: boolean;
    amountPaid: number;
    amountOwed: number;
    amountPerUnit: number;
  }[];
}

interface FacilityReportRow {
  serviceName: string;
  doneCount: number;
  total: number;
  pct: number;
}

export function ReportsView({
  dieselReport,
  dieselCycles,
  dieselPool,
  serviceChargeReport,
  facilityReport,
}: {
  dieselReport: DieselReportRow[];
  dieselCycles: { id: string; cycle_number: number; amount_per_unit: number }[];
  dieselPool: DieselPoolTotals;
  serviceChargeReport: ServiceChargePeriodReport[];
  facilityReport: FacilityReportRow[];
}) {
  const handleExportDiesel = () => {
    const rows = dieselReport.map((r) => ({
      flat: r.flat_number,
      owner: r.owner_name,
      onGenerator: r.dieselOnGenerator ? "Yes" : "No",
      paidThisCycle: r.dieselNotApplicable ? "—" : r.paidCurrentCycle,
      totalExpected: r.dieselNotApplicable ? "—" : r.totalExpected,
      totalPaid: r.dieselNotApplicable ? "—" : r.totalPaid,
      balance: r.dieselNotApplicable ? "—" : r.balance,
      status: r.dieselNotApplicable
        ? "Off generator"
        : r.owedCycles > 0
          ? `Owes ${r.owedCycles} cycle(s)`
          : r.aheadCycles > 0
            ? `Ahead ${r.aheadCycles} cycle(s)`
            : "Paid up",
    }));
    const csv = exportToCSV(rows, [
      { key: "flat", header: "Flat" },
      { key: "owner", header: "Owner" },
      { key: "onGenerator", header: "On generator" },
      { key: "paidThisCycle", header: "Paid this cycle (₦)" },
      { key: "totalExpected", header: "Total Expected (₦)" },
      { key: "totalPaid", header: "Total Paid (₦)" },
      { key: "balance", header: "Balance (₦)" },
      { key: "status", header: "Status" },
    ]);
    const poolRows = [
      {
        metric: "Estate: collected this cycle",
        amount: dieselPool.collectedThisCycle,
      },
      {
        metric: "Estate: purchases this cycle",
        amount: dieselPool.purchasesThisCycle,
      },
      { metric: "Estate: net this cycle", amount: dieselPool.netThisCycle },
      {
        metric: "Estate: lifetime collected (on gen)",
        amount: dieselPool.lifetimeCollected,
      },
      {
        metric: "Estate: lifetime purchases",
        amount: dieselPool.lifetimePurchases,
      },
      { metric: "Estate: net fund (all time)", amount: dieselPool.netLifetime },
    ];
    const poolCsv = exportToCSV(poolRows, [
      { key: "metric", header: "Metric" },
      { key: "amount", header: "Amount (₦)" },
    ]);
    downloadCSV(`${poolCsv}\n\n${csv}`, "diesel-fund-ledger.csv");
  };

  const handleExportServiceCharge = (periodLabel: string, unitStatuses: ServiceChargePeriodReport["unitStatuses"]) => {
    const rows = unitStatuses.map((u) => {
      const partial = !u.paid && u.amountPaid > 0;
      return {
        flat: u.flat_number,
        owner: u.owner_name,
        status: u.paid ? "Paid" : partial ? "Partial" : "Outstanding",
        amountCovered: u.amountPaid,
        amountOwed: u.paid ? 0 : u.amountOwed,
        amountExpected: u.amountPerUnit,
      };
    });
    const csv = exportToCSV(rows, [
      { key: "flat", header: "Flat" },
      { key: "owner", header: "Owner" },
      { key: "status", header: "Status" },
      { key: "amountCovered", header: "Covered (₦)" },
      { key: "amountOwed", header: "Still owed (₦)" },
      { key: "amountExpected", header: "Period target (₦)" },
    ]);
    downloadCSV(csv, `service-charge-${periodLabel.replace(/\s+/g, "-")}.csv`);
  };

  const handleExportFacility = () => {
    const rows = facilityReport.map((r) => ({
      service: r.serviceName,
      doneCount: r.doneCount,
      total: r.total,
      pct: `${r.pct}%`,
    }));
    const csv = exportToCSV(rows, [
      { key: "service", header: "Service" },
      { key: "doneCount", header: "Months Done" },
      { key: "total", header: "Total Months" },
      { key: "pct", header: "Delivery %" },
    ]);
    downloadCSV(csv, "facility-performance.csv");
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-8 print:space-y-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Print for AGM
        </button>
      </div>
      <section className="break-inside-avoid">
        <div className="mb-3 flex items-center justify-between print:justify-start">
          <h2 className="text-lg font-semibold">Diesel fund</h2>
          <button
            onClick={handleExportDiesel}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 print:hidden dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Export CSV
          </button>
        </div>
        <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700">
            <span className="text-zinc-500">Collected this cycle</span>
            <p className="font-medium">{formatCurrency(dieselPool.collectedThisCycle)}</p>
          </div>
          <div className="rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700">
            <span className="text-zinc-500">Purchases this cycle</span>
            <p className="font-medium">{formatCurrency(dieselPool.purchasesThisCycle)}</p>
          </div>
          <div className="rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700">
            <span className="text-zinc-500">Net fund (all time)</span>
            <p className="font-medium">{formatCurrency(dieselPool.netLifetime)}</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Flat
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Gen.
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  This cycle
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Expected
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Paid
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Balance
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {dieselReport.map((r) => (
                <tr key={r.flat_number}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {r.flat_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {r.owner_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {r.dieselOnGenerator ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {r.dieselNotApplicable ? "—" : formatCurrency(r.paidCurrentCycle)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {r.dieselNotApplicable ? "—" : formatCurrency(r.totalExpected)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {r.dieselNotApplicable ? "—" : formatCurrency(r.totalPaid)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {r.dieselNotApplicable ? (
                      "—"
                    ) : r.balance < 0 ? (
                      <span className="text-amber-600">-{formatCurrency(Math.abs(r.balance))}</span>
                    ) : r.balance > 0 ? (
                      <span className="text-emerald-600">+{formatCurrency(r.balance)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {r.dieselNotApplicable ? (
                      <span className="text-zinc-500">Off generator</span>
                    ) : r.owedCycles > 0 ? (
                      <span className="text-amber-600">Owes {r.owedCycles} cycle(s)</span>
                    ) : r.aheadCycles > 0 ? (
                      <span className="text-emerald-600">Ahead {r.aheadCycles} cycle(s)</span>
                    ) : (
                      <span className="text-zinc-500">Paid up</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold">Service charge</h2>
        {serviceChargeReport.map(({ period, unitStatuses }) => (
          <div key={period.id} className="mb-6">
            <div className="mb-2 flex items-center justify-between print:justify-start">
              <span className="font-medium">{period.period_label}</span>
              <button
                onClick={() => handleExportServiceCharge(period.period_label, unitStatuses)}
                className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 print:hidden dark:border-zinc-600 dark:hover:bg-zinc-800"
              >
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                      Flat
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                      Owner
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                  {unitStatuses.map((u) => {
                    const partial = !u.paid && u.amountPaid > 0;
                    return (
                      <tr key={u.flat_number}>
                        <td className="px-4 py-2 text-sm">{u.flat_number}</td>
                        <td className="px-4 py-2 text-sm">{u.owner_name}</td>
                        <td className="px-4 py-2 text-sm">
                          {u.paid ? (
                            <span className="text-emerald-600">Paid</span>
                          ) : partial ? (
                            <span className="text-orange-600">Partial</span>
                          ) : (
                            <span className="text-amber-600">Outstanding</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          {u.paid ? (
                            formatCurrency(u.amountPerUnit)
                          ) : (
                            <span>
                              {formatCurrency(u.amountPaid)} /{" "}
                              {formatCurrency(u.amountPerUnit)}
                              {partial && (
                                <span className="ml-1 text-xs text-zinc-500">
                                  (owes {formatCurrency(u.amountOwed)})
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <section className="break-inside-avoid">
        <div className="mb-3 flex items-center justify-between print:justify-start">
          <h2 className="text-lg font-semibold">Facility performance</h2>
          <button
            onClick={handleExportFacility}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 print:hidden dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Export CSV
          </button>
        </div>
        <p className="mb-3 text-sm text-zinc-500">
          Percentage of services marked &quot;Done&quot; in the last 3 months
        </p>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Service
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Done
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {facilityReport.map((r) => (
                <tr key={r.serviceName}>
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {r.serviceName}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">{r.doneCount}</td>
                  <td className="px-4 py-3 text-right text-sm">{r.total}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <span
                      className={
                        r.pct >= 80
                          ? "text-emerald-600"
                          : r.pct >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                      }
                    >
                      {r.pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
