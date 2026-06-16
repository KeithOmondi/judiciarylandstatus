// pages/AdminReports.tsx

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchLandStatus,
  selectAllLandStatus,
  selectLandStatusSummary,
  selectLandStatusListLoading,
} from '../../store/slices/landSlice';

/* ============================================================
   SPINNER COMPONENT
============================================================ */

const Spinner = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => (
  <svg
    className={`animate-spin ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} text-current`}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

/* ============================================================
   STAT CARD COMPONENT
============================================================ */

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'slate';
  loading?: boolean;
}

const StatCard = ({ title, value, icon, color, loading }: StatCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-emerald-50 border-emerald-200',
    red: 'bg-red-50 border-red-200',
    amber: 'bg-amber-50 border-amber-200',
    purple: 'bg-purple-50 border-purple-200',
    slate: 'bg-slate-50 border-slate-200',
  };

  const textColors = {
    blue: 'text-blue-700',
    green: 'text-emerald-700',
    red: 'text-red-700',
    amber: 'text-amber-700',
    purple: 'text-purple-700',
    slate: 'text-slate-700',
  };

  const iconColors = {
    blue: 'text-blue-600',
    green: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
    slate: 'text-slate-600',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          {loading ? (
            <div className="mt-2"><Spinner size="md" /></div>
          ) : (
            <p className={`text-2xl font-bold ${textColors[color]} mt-1`}>{value}</p>
          )}
        </div>
        <div className={`${iconColors[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

/* ============================================================
   SECTION CARD COMPONENT
============================================================ */

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}

const SectionCard = ({ title, children, icon }: SectionCardProps) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
      <div className="flex items-center gap-2">
        <div className="text-slate-500">{icon}</div>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      </div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

/* ============================================================
   BREAKDOWN TABLE / LIST
============================================================ */

interface BreakdownItem {
  label: string;
  count: number;
  max: number;
}

const BreakdownList = ({ items, color }: { items: BreakdownItem[]; color?: string }) => {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">No data available</p>;
  }
  const barColor = color || '#2563EB';
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">{item.label}</span>
            <span className="font-semibold text-slate-800">{item.count}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item.count / item.max) * 100}%`, background: barColor }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

/* ============================================================
   MAIN REPORTS COMPONENT
============================================================ */

const AdminReports = () => {
  const dispatch = useAppDispatch();

  const allLand = useAppSelector(selectAllLandStatus);
  const summary = useAppSelector(selectLandStatusSummary);
  const loading = useAppSelector(selectLandStatusListLoading);

  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleString());

  // Fetch land data on mount
  useEffect(() => {
    const fetchData = async () => {
      await dispatch(fetchLandStatus({ limit: 500 })); // fetch enough for reports
      setLastUpdated(new Date().toLocaleString());
    };
    fetchData();
  }, [dispatch]);

  const handleRefresh = () => {
    setLastUpdated(new Date().toLocaleString());
    dispatch(fetchLandStatus({ limit: 500 }));
  };

  // ── Compute metrics ──
  const totalProperties = summary?.total_properties ?? 0;
  const totalCounties = summary?.counties ?? 0;

  // Disputed count: non-empty disputes field
  const disputedCount = allLand.filter((l) => l.disputes && l.disputes.trim().length > 0).length;

  // Owned count (ownership_status contains 'owned' case-insensitive)
  const ownedCount = allLand.filter(
    (l) => l.ownership_status && l.ownership_status.toLowerCase().includes('owned')
  ).length;

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  allLand.forEach((l) => {
    const st = l.status || 'Unknown';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });
  const statusBreakdown: BreakdownItem[] = Object.entries(statusCounts)
    .map(([label, count]) => ({ label, count, max: Math.max(...Object.values(statusCounts), 1) }))
    .sort((a, b) => b.count - a.count);

  // County breakdown
  const countyCounts: Record<string, number> = {};
  allLand.forEach((l) => {
    const county = l.county || 'Unknown';
    countyCounts[county] = (countyCounts[county] || 0) + 1;
  });
  const countyBreakdown: BreakdownItem[] = Object.entries(countyCounts)
    .map(([label, count]) => ({ label, count, max: Math.max(...Object.values(countyCounts), 1) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // show top 10 counties

  // Ownership status breakdown
  const ownershipCounts: Record<string, number> = {};
  allLand.forEach((l) => {
    const own = l.ownership_status || 'Unknown';
    ownershipCounts[own] = (ownershipCounts[own] || 0) + 1;
  });
  const ownershipBreakdown: BreakdownItem[] = Object.entries(ownershipCounts)
    .map(([label, count]) => ({ label, count, max: Math.max(...Object.values(ownershipCounts), 1) }))
    .sort((a, b) => b.count - a.count);

  // Intended use breakdown
  const useCounts: Record<string, number> = {};
  allLand.forEach((l) => {
    const use = l.current_intended_use || 'Not specified';
    useCounts[use] = (useCounts[use] || 0) + 1;
  });
  const useBreakdown: BreakdownItem[] = Object.entries(useCounts)
    .map(([label, count]) => ({ label, count, max: Math.max(...Object.values(useCounts), 1) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Average acreage (if we have numeric values, but we'll just show count)
  // We can also compute total acreage if we parse, but skip for now.

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Land Reports Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Last updated: {lastUpdated}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Properties"
            value={totalProperties}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2" />
              </svg>
            }
            color="blue"
            loading={loading}
          />
          <StatCard
            title="Counties"
            value={totalCounties}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            color="purple"
            loading={loading}
          />
          <StatCard
            title="Disputed Properties"
            value={disputedCount}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            color="red"
            loading={loading}
          />
          <StatCard
            title="Owned Properties"
            value={ownedCount}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
            loading={loading}
          />
        </div>

        {/* Breakdown Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Breakdown */}
          <SectionCard
            title="Properties by Status"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          >
            <BreakdownList items={statusBreakdown} color="#7C3AED" />
          </SectionCard>

          {/* County Breakdown */}
          <SectionCard
            title="Top Counties"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2" />
              </svg>
            }
          >
            <BreakdownList items={countyBreakdown} color="#2563EB" />
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Ownership Breakdown */}
          <SectionCard
            title="Ownership Status"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          >
            <BreakdownList items={ownershipBreakdown} color="#059669" />
          </SectionCard>

          {/* Intended Use Breakdown */}
          <SectionCard
            title="Intended Use"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          >
            <BreakdownList items={useBreakdown} color="#D97706" />
          </SectionCard>
        </div>

        {/* Summary table with key figures */}
        <div className="mt-6">
          <SectionCard
            title="Land Registry Summary"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{totalProperties}</p>
                <p className="text-xs text-slate-500 mt-1">Total Properties</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-700">{totalCounties}</p>
                <p className="text-xs text-slate-500 mt-1">Counties</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">{disputedCount}</p>
                <p className="text-xs text-slate-500 mt-1">Disputed</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-700">{ownedCount}</p>
                <p className="text-xs text-slate-500 mt-1">Owned</p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Export Section */}
        <div className="mt-8 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Export Reports</h3>
              <p className="text-xs text-slate-500 mt-0.5">Download comprehensive land reports for audit and review</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PDF
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;  