// pages/AdminReports.tsx

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchLegalDues,
  selectLegalDuesSummary,
  selectLegalDuesListLoading,
} from '../../store/slices/legalduesSlice';
import {
  fetchDemands,
  selectDemandsSummary,
  selectDemandsListLoading,
  formatCurrency,
} from '../../store/slices/demandsSlice';
import {
  fetchStaffCases,
  selectStaffCasesSummary,
  selectStaffCasesListLoading,
} from '../../store/slices/staffCasesSlice';

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
   MAIN REPORTS COMPONENT
============================================================ */

const AdminReports = () => {
  const dispatch = useAppDispatch();

  // Legal Dues Data
  const legalSummary = useAppSelector(selectLegalDuesSummary);
  const legalLoading = useAppSelector(selectLegalDuesListLoading);

  // Demands Data
  const demandsSummary = useAppSelector(selectDemandsSummary);
  const demandsLoading = useAppSelector(selectDemandsListLoading);

  // Staff Cases Data
  const staffSummary = useAppSelector(selectStaffCasesSummary);
  const staffLoading = useAppSelector(selectStaffCasesListLoading);

  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleString());

  // Fetch all data on mount
  useEffect(() => {
    const fetchAllData = async () => {
      await Promise.all([
        dispatch(fetchLegalDues({ limit: 100 })),
        dispatch(fetchDemands({ limit: 100 })),
        dispatch(fetchStaffCases({ limit: 100 })),
      ]);
      setLastUpdated(new Date().toLocaleString());
    };

    fetchAllData();
  }, [dispatch]);

  const handleRefresh = () => {
    setLastUpdated(new Date().toLocaleString());
    Promise.all([
      dispatch(fetchLegalDues({ limit: 100 })),
      dispatch(fetchDemands({ limit: 100 })),
      dispatch(fetchStaffCases({ limit: 100 })),
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports Dashboard</h1>
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
            title="Total Outstanding Legal Dues"
            value={formatCurrency(legalSummary?.total_outstanding_all ?? 0)}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="red"
            loading={legalLoading}
          />
          <StatCard
            title="Total Paid (Legal Dues)"
            value={formatCurrency(legalSummary?.total_paid_all ?? 0)}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
            loading={legalLoading}
          />
          <StatCard
            title="Total Incoming Demands"
            value={demandsSummary?.total_incoming ?? 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M6 14h12m-7 4h2M12 3v18" />
              </svg>
            }
            color="amber"
            loading={demandsLoading}
          />
          <StatCard
            title="Total Staff Cases"
            value={staffSummary?.total_cases ?? 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            color="slate"
            loading={staffLoading}
          />
        </div>

        {/* Second Row Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Total Amount Claimed"
            value={formatCurrency(demandsSummary?.total_amount_claimed ?? 0)}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            color="purple"
            loading={demandsLoading}
          />
          <StatCard
            title="Total Amount Settled"
            value={formatCurrency(demandsSummary?.total_amount_settled ?? 0)}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            color="green"
            loading={demandsLoading}
          />
          <StatCard
            title="Pending / In Negotiation"
            value={`${demandsSummary?.pending_count ?? 0} / ${demandsSummary?.in_negotiation_count ?? 0}`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="amber"
            loading={demandsLoading}
          />
        </div>

        {/* Legal Dues Section */}
        <SectionCard
          title="Legal Dues Overview"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{formatCurrency(legalSummary?.total_outstanding_all ?? 0)}</p>
              <p className="text-xs text-slate-500 mt-1">Total Outstanding</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(legalSummary?.total_paid_all ?? 0)}</p>
              <p className="text-xs text-slate-500 mt-1">Total Paid</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(legalSummary?.total_interest_accrued_all ?? 0)}</p>
              <p className="text-xs text-slate-500 mt-1">Interest Accrued</p>
            </div>
          </div>
        </SectionCard>

        {/* Demands Section */}
        <div className="mt-6">
          <SectionCard
            title="Demands Overview"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{demandsSummary?.total_incoming ?? 0}</p>
                <p className="text-xs text-slate-500 mt-1">Incoming</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600">{demandsSummary?.total_outgoing ?? 0}</p>
                <p className="text-xs text-slate-500 mt-1">Outgoing</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{demandsSummary?.pending_count ?? 0}</p>
                <p className="text-xs text-slate-500 mt-1">Pending</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{demandsSummary?.escalated_count ?? 0}</p>
                <p className="text-xs text-slate-500 mt-1">Escalated</p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Staff Criminal Cases Section */}
        <div className="mt-6">
          <SectionCard
            title="Staff Criminal Cases Overview"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">{staffSummary?.total_cases ?? 0}</p>
                <p className="text-xs text-slate-500 mt-1">Total Cases</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{staffSummary?.suspension_count ?? 0}</p>
                <p className="text-xs text-slate-500 mt-1">Suspensions</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{staffSummary?.interdiction_count ?? 0}</p>
                <p className="text-xs text-slate-500 mt-1">Interdictions</p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Export Section */}
        <div className="mt-8 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Export Reports</h3>
              <p className="text-xs text-slate-500 mt-0.5">Download comprehensive reports for audit and review</p>
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