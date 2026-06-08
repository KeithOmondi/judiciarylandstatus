// pages/AdminDashboard.tsx

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchLegalDues,
  selectLegalDuesSummary,
  selectAllLegalDues,
  selectLegalDuesListLoading,
} from "../../store/slices/legalduesSlice";
import {
  fetchDemands,
  selectAllDemands,
  selectDemandsListLoading,
  formatCurrency,
} from "../../store/slices/demandsSlice";
import {
  fetchStaffCases,
  selectStaffCasesSummary,
  selectAllStaffCases,
  selectStaffCasesListLoading,
} from "../../store/slices/staffCasesSlice";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const StatusPill = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Ongoing:   "bg-amber-100 text-amber-800",
    Concluded: "bg-emerald-100 text-emerald-800",
    Unpaid:    "bg-red-100 text-red-700",
    Partial:   "bg-blue-100 text-blue-700",
    pending:   "bg-amber-100 text-amber-700",
    in_negotiation: "bg-blue-100 text-blue-700",
    settled:   "bg-emerald-100 text-emerald-700",
    escalated: "bg-rose-100 text-rose-700",
    suspension: "bg-amber-100 text-amber-700",
    interdiction: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState("");

  // Legal Dues Data
  const legalSummary = useAppSelector(selectLegalDuesSummary);
  const allLegalDues = useAppSelector(selectAllLegalDues);
  const legalLoading = useAppSelector(selectLegalDuesListLoading);

  // Demands Data - removed unused demandsSummary
  const allDemands = useAppSelector(selectAllDemands);
  const demandsLoading = useAppSelector(selectDemandsListLoading);

  // Staff Cases Data
  const staffSummary = useAppSelector(selectStaffCasesSummary);
  const allStaffCases = useAppSelector(selectAllStaffCases);
  const staffLoading = useAppSelector(selectStaffCasesListLoading);

  // Fetch all data on mount
  useEffect(() => {
    dispatch(fetchLegalDues({ limit: 50 }));
    dispatch(fetchDemands({ limit: 50 }));
    dispatch(fetchStaffCases({ limit: 50 }));
  }, [dispatch]);

  // Calculate metrics from real data
  const totalCases = allLegalDues.length + allDemands.length + allStaffCases.length;
  
  const ongoingCases = allLegalDues.filter(d => d.status === 'pending' || d.status === 'partial').length +
                       allDemands.filter(d => d.status === 'pending' || d.status === 'in_negotiation').length +
                       allStaffCases.filter(s => s.latest_action === 'interdiction' || s.latest_action === 'suspension').length;

  const outstandingDues = legalSummary?.total_outstanding_all ?? 0;
  const totalDues = (legalSummary?.total_outstanding_all ?? 0) + (legalSummary?.total_paid_all ?? 0);

  const staffCasesCount = staffSummary?.total_cases ?? 0;
  const interdictionCount = staffSummary?.interdiction_count ?? 0;

  const METRICS = [
    { label: "Total Cases", value: totalCases.toString(), delta: `${allLegalDues.length} legal, ${allDemands.length} demands, ${allStaffCases.length} staff`, trend: "up", color: "#2563EB", loading: legalLoading || demandsLoading || staffLoading },
    { label: "Ongoing", value: ongoingCases.toString(), delta: "Require action", trend: "neutral", color: "#D97706", loading: legalLoading || demandsLoading },
    { label: "Outstanding Dues", value: formatCurrency(outstandingDues), delta: `of ${formatCurrency(totalDues)} total`, trend: "down", color: "#DC2626", loading: legalLoading },
    { label: "Staff Criminal", value: staffCasesCount.toString(), delta: `${interdictionCount} under interdiction`, trend: "down", color: "#7C3AED", loading: staffLoading },
  ];

  // Get recent cases from legal dues
  const recentLegalDues = allLegalDues.slice(0, 5).map(due => ({
    id: due.id,
    ref: due.reference_number || `LD-${due.id}`,
    plaintiff: due.debtors.map(d => d.name).join(', '),
    category: due.type.replace(/_/g, ' ').toUpperCase(),
    station: due.cases[0]?.court_station || 'Various',
    status: due.status === 'pending' ? 'Ongoing' : due.status === 'paid' ? 'Concluded' : due.status,
    filed: due.date_incurred ? new Date(due.date_incurred).toLocaleDateString('en-KE') : 'N/A'
  }));

  // Get recent demands
  const recentDemands = allDemands.slice(0, 3).map(demand => ({
    id: demand.id,
    ref: demand.demand_number,
    plaintiff: demand.claimant_name,
    category: demand.direction === 'incoming' ? 'Demand In' : 'Demand Out',
    station: 'N/A',
    status: demand.status === 'pending' ? 'Ongoing' : demand.status === 'settled' ? 'Concluded' : demand.status,
    filed: new Date(demand.date_received).toLocaleDateString('en-KE')
  }));

  // Combine recent cases
  const RECENT_CASES = [...recentLegalDues, ...recentDemands].slice(0, 5);

  // Category breakdown from legal dues
  const typeCounts: Record<string, number> = {};
  allLegalDues.forEach(due => {
    const type = due.type.replace(/_/g, ' ').toUpperCase();
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  
  const CATEGORY_BREAKDOWN = Object.entries(typeCounts)
    .map(([label, count]) => ({ label, count, max: Math.max(...Object.values(typeCounts), 1) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Top outstanding dues
  const TOP_DUES = allLegalDues
    .filter(d => d.outstanding_amount > 0)
    .sort((a, b) => b.outstanding_amount - a.outstanding_amount)
    .slice(0, 3)
    .map(due => ({
      debtor: due.debtors.map(d => d.name).join(', '),
      dispute: due.dispute_description?.substring(0, 60) || 'N/A',
      amount: formatCurrency(due.outstanding_amount).replace('KSh ', ''),
      status: due.outstanding_amount === due.total_amount ? 'Unpaid' : 'Partial'
    }));

  // Representation breakdown from demands
  const directionCounts = {
    incoming: allDemands.filter(d => d.direction === 'incoming').length,
    outgoing: allDemands.filter(d => d.direction === 'outgoing').length,
  };
  const totalDemands = allDemands.length || 1;

  const REPRESENTATION = [
    { label: "Incoming Demands", count: directionCounts.incoming, pct: (directionCounts.incoming / totalDemands) * 100 },
    { label: "Outgoing Demands", count: directionCounts.outgoing, pct: (directionCounts.outgoing / totalDemands) * 100 },
    { label: "Legal Dues", count: allLegalDues.length, pct: Math.min((allLegalDues.length / 50) * 100, 100) },
    { label: "Staff Cases", count: allStaffCases.length, pct: Math.min((allStaffCases.length / 20) * 100, 100) },
  ];

  const filteredCases = RECENT_CASES.filter((c) =>
    [c.ref, c.plaintiff, c.category, c.station].some((v) =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );

  const BAR_COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706"];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · FY {new Date().getFullYear()}/{new Date().getFullYear() + 1}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search cases, parties…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 w-52"
            />
            <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
            ⬇ Export
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white font-semibold transition-colors hover:opacity-90"
            style={{ background: "#1e40af" }}
          >
            + New Case
          </button>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {METRICS.map((m) => (
            <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{m.label}</p>
                <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: m.color }} />
              </div>
              {m.loading ? (
                <div className="h-8 flex items-center">
                  <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                </div>
              ) : (
                <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{m.delta}</p>
            </div>
          ))}
        </div>

        {/* ── Mid row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Category breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-800">Cases by Category</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {CATEGORY_BREAKDOWN.length === 0 ? (
                <p className="text-center text-gray-400 py-4 text-sm">No data available</p>
              ) : (
                CATEGORY_BREAKDOWN.map((c) => (
                  <div key={c.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{c.label}</span>
                      <span className="font-semibold text-gray-800">{c.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(c.count / c.max) * 100}%`, background: "#2563EB" }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Representation */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-800">Case Distribution</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              {REPRESENTATION.map((r, i) => (
                <div key={r.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{r.label}</span>
                    <span className="font-semibold text-gray-800">{r.count} cases</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(r.pct, 100)}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Recent Cases ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">Recent Cases & Demands</h2>
            <button className="text-xs text-blue-600 hover:underline font-medium">View all →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {["File Ref", "Party", "Category", "Station", "Filed", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">
                      No cases match your search.
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="px-5 py-3 font-semibold text-blue-600 whitespace-nowrap text-xs">{c.ref}</td>
                      <td className="px-5 py-3 text-gray-800 max-w-[200px] truncate">{c.plaintiff}</td>
                      <td className="px-5 py-3">
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{c.category}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{c.station}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{c.filed}</td>
                      <td className="px-5 py-3"><StatusPill status={c.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Outstanding Dues ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">Top Outstanding Dues</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Total: <span className="font-bold text-red-600">{formatCurrency(outstandingDues)}</span>
              </span>
              <button className="text-xs text-blue-600 hover:underline font-medium">View all →</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Judgment Debtor", "Dispute", "Outstanding (KSh)", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOP_DUES.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">
                      No outstanding dues
                    </td>
                  </tr>
                ) : (
                  TOP_DUES.map((d) => (
                    <tr key={d.debtor} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-gray-800 max-w-[200px] truncate" title={d.debtor}>{d.debtor}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs max-w-[250px] truncate" title={d.dispute}>{d.dispute}</td>
                      <td className="px-5 py-3 font-bold text-red-600 tabular-nums whitespace-nowrap">{d.amount}</td>
                      <td className="px-5 py-3"><StatusPill status={d.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
};

export default AdminDashboard;