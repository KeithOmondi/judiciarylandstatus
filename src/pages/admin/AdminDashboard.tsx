// pages/AdminDashboard.tsx

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchLandStatus,
  selectAllLandStatus,
  selectLandStatusSummary,
  selectLandStatusListLoading,
  formatAcreage,
  getStatusBadgeClass,
} from "../../store/slices/landSlice";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const StatusPill = ({ status }: { status: string | null }) => {
  if (!status) return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">—</span>;
  const badgeClass = getStatusBadgeClass(status);
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState("");

  // Land data
  const allLand = useAppSelector(selectAllLandStatus);
  const summary = useAppSelector(selectLandStatusSummary);
  const loading = useAppSelector(selectLandStatusListLoading);

  // Fetch land data on mount
  useEffect(() => {
    dispatch(fetchLandStatus({ limit: 100 }));
  }, [dispatch]);

  // ── Compute metrics ──
  const totalProperties = summary?.total_properties ?? 0;
  const totalCounties = summary?.counties ?? 0;

  const disputedCount = allLand.filter(
    (l) => l.disputes && l.disputes.trim().length > 0
  ).length;

  const ownedCount = allLand.filter(
    (l) => l.ownership_status?.toLowerCase() === 'owned'
  ).length;

  const METRICS = [
    {
      label: "Total Properties",
      value: totalProperties.toString(),
      delta: `${allLand.length} loaded`,
      trend: "up",
      color: "#2563EB",
      loading,
    },
    {
      label: "Counties",
      value: totalCounties.toString(),
      delta: "represented",
      trend: "neutral",
      color: "#7C3AED",
      loading,
    },
    {
      label: "Disputed",
      value: disputedCount.toString(),
      delta: `${((disputedCount / (totalProperties || 1)) * 100).toFixed(1)}% of total`,
      trend: "down",
      color: "#DC2626",
      loading,
    },
    {
      label: "Owned Properties",
      value: ownedCount.toString(),
      delta: `${((ownedCount / (totalProperties || 1)) * 100).toFixed(1)}%`,
      trend: "up",
      color: "#059669",
      loading,
    },
  ];

  // ── County breakdown ──
  const countyCounts: Record<string, number> = {};
  allLand.forEach((l) => {
    const county = l.county || "Unknown";
    countyCounts[county] = (countyCounts[county] || 0) + 1;
  });
  const COUNTY_BREAKDOWN = Object.entries(countyCounts)
    .map(([label, count]) => ({ label, count, max: Math.max(...Object.values(countyCounts), 1) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Status breakdown ──
  const statusCounts: Record<string, number> = {};
  allLand.forEach((l) => {
    const st = l.status || "Unknown";
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });
  const STATUS_BREAKDOWN = Object.entries(statusCounts)
    .map(([label, count]) => ({ label, count, max: Math.max(...Object.values(statusCounts), 1) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ── Recent records ──
  const RECENT_RECORDS = allLand
    .slice(0, 5)
    .map((record) => ({
      id: record.id,
      ref: record.file_ref || `L-${record.id}`,
      property: record.property || "—",
      county: record.county || "—",
      status: record.status,
      acreage: formatAcreage(record.acreage),
      created: new Date(record.created_at).toLocaleDateString("en-KE"),
    }));

  // ── Disputes (top 3 with disputes) ──
  const TOP_DISPUTES = allLand
    .filter((l) => l.disputes && l.disputes.trim().length > 0)
    .slice(0, 3)
    .map((l) => ({
      property: l.property || l.file_ref || "Unknown",
      county: l.county || "—",
      dispute: l.disputes?.substring(0, 80) + (l.disputes && l.disputes.length > 80 ? "…" : ""),
      status: l.status,
    }));

  // ── Filter recent records by search (fix null safety) ──
  const filteredRecords = RECENT_RECORDS.filter((r) =>
    [r.ref, r.property, r.county, r.status].some((v) =>
      (v ?? '').toLowerCase().includes(search.toLowerCase())
    )
  );

  // ── Bar colors ──
  const BAR_COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DC2626", "#8B5CF6"];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Land Registry Dashboard</h1>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {totalProperties} records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search properties, counties…"
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
            + Add Property
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

        {/* ── Mid row: County & Status Breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* County breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-800">Properties by County</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {COUNTY_BREAKDOWN.length === 0 ? (
                <p className="text-center text-gray-400 py-4 text-sm">No data available</p>
              ) : (
                COUNTY_BREAKDOWN.map((c, i) => (
                  <div key={c.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{c.label}</span>
                      <span className="font-semibold text-gray-800">{c.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(c.count / c.max) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-800">Properties by Status</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {STATUS_BREAKDOWN.length === 0 ? (
                <p className="text-center text-gray-400 py-4 text-sm">No data available</p>
              ) : (
                STATUS_BREAKDOWN.map((s, i) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{s.label}</span>
                      <span className="font-semibold text-gray-800">{s.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(s.count / s.max) * 100}%`, background: BAR_COLORS[(i + 2) % BAR_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Recent Records ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">Recent Land Records</h2>
            <button className="text-xs text-blue-600 hover:underline font-medium">View all →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {["File Ref", "Property", "County", "Status", "Acreage", "Created"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">
                      No records match your search.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="px-5 py-3 font-semibold text-blue-600 whitespace-nowrap text-xs">{r.ref}</td>
                      <td className="px-5 py-3 text-gray-800 max-w-[200px] truncate">{r.property}</td>
                      <td className="px-5 py-3 text-gray-600 text-xs">{r.county}</td>
                      <td className="px-5 py-3"><StatusPill status={r.status} /></td>
                      <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{r.acreage}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{r.created}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Top Disputes ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">Top Disputes</h2>
            <span className="text-xs text-gray-400">
              Total disputed: <span className="font-bold text-red-600">{disputedCount}</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Property", "County", "Dispute Description", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOP_DISPUTES.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">
                      No disputes recorded
                    </td>
                  </tr>
                ) : (
                  TOP_DISPUTES.map((d, idx) => (
                    <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-gray-800 max-w-[150px] truncate" title={d.property}>{d.property}</td>
                      <td className="px-5 py-3 text-gray-600 text-xs">{d.county}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs max-w-[300px] truncate" title={d.dispute}>{d.dispute}</td>
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