// pages/AdminStaffCriminal.tsx

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  fetchStaffCases,
  createStaffCase,
  updateStaffCase,
  deleteStaffCase,
  setFilters,
  resetFilters,
  clearSelectedCase,
  clearError,
  fetchStaffCaseById,
  selectAllStaffCases,
  selectStaffCasesPagination,
  selectStaffCasesFilters,
  selectStaffCasesListLoading,
  selectStaffCasesMutating,
  selectStaffCasesError,
  selectSelectedStaffCase,
  selectStaffCasesSummary,
  type StaffCriminalCase,
  type CreateStaffCaseDto,
  type EmploymentAction,
} from '../../store/slices/staffCasesSlice';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { getActionBadgeClass, getActionLabel, formatDate } from '../../store/slices/staffCasesSlice';

/* ============================================================
   CONSTANTS
============================================================ */

const EMPLOYMENT_ACTIONS: EmploymentAction[] = [
  'suspension', 'interdiction', 'termination', 'dismissal', 'disciplinary_warning', 'none'
];

const EMPTY_FORM: CreateStaffCaseDto = {
  name: '',
  designation: '',
  station: '',
  date_of_reporting: new Date().toISOString().split('T')[0],
  nature_of_offence: '',
  court_file_ref: '',
  latest_action: 'none',
  hearing_conviction_date: '',
};

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
   DELETE MODAL
============================================================ */

interface DeleteModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeleteModal = ({ title, message, onConfirm, onCancel, loading }: DeleteModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl p-6">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {loading && <Spinner />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

/* ============================================================
   STAFF CASE MODAL (ADD/EDIT)
============================================================ */

interface StaffCaseModalProps {
  initial: StaffCriminalCase | null;
  onSubmit: (data: CreateStaffCaseDto) => void;
  onClose: () => void;
  loading: boolean;
}

const StaffCaseModal = ({ initial, onSubmit, onClose, loading }: StaffCaseModalProps) => {
  const isEdit = !!initial;
  const [form, setForm] = useState<CreateStaffCaseDto>(() =>
    initial
      ? {
          name: initial.name,
          designation: initial.designation,
          station: initial.station,
          date_of_reporting: initial.date_of_reporting.split('T')[0],
          nature_of_offence: initial.nature_of_offence,
          court_file_ref: initial.court_file_ref ?? '',
          latest_action: initial.latest_action,
          hearing_conviction_date: initial.hearing_conviction_date ?? '',
        }
      : { ...EMPTY_FORM }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl my-8 rounded-xl bg-white shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Staff Case' : 'Add Staff Case'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Name *</label>
              <input
                className="rounded-md border p-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Designation *</label>
              <input
                className="rounded-md border p-2"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Station *</label>
              <input
                className="rounded-md border p-2"
                value={form.station}
                onChange={(e) => setForm({ ...form, station: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Date of Reporting *</label>
              <input
                type="date"
                className="rounded-md border p-2"
                value={form.date_of_reporting}
                onChange={(e) => setForm({ ...form, date_of_reporting: e.target.value })}
                required
              />
            </div>

            <div className="col-span-full">
              <label className="text-xs font-medium">Nature of Offence *</label>
              <textarea
                rows={2}
                className="rounded-md border p-2 w-full"
                value={form.nature_of_offence}
                onChange={(e) => setForm({ ...form, nature_of_offence: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Court File Ref</label>
              <input
                className="rounded-md border p-2"
                value={form.court_file_ref}
                onChange={(e) => setForm({ ...form, court_file_ref: e.target.value })}
                placeholder="e.g., Mombasa CR. Case No. 1180 of 2021"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Latest Action *</label>
              <select
                className="rounded-md border p-2"
                value={form.latest_action}
                onChange={(e) => setForm({ ...form, latest_action: e.target.value as EmploymentAction })}
                required
              >
                {EMPLOYMENT_ACTIONS.map((action) => (
                  <option key={action} value={action}>{getActionLabel(action)}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Hearing/Conviction Date</label>
              <input
                className="rounded-md border p-2"
                value={form.hearing_conviction_date}
                onChange={(e) => setForm({ ...form, hearing_conviction_date: e.target.value })}
                placeholder="e.g., JD-25/09/2025"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {loading && <Spinner />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   DETAIL VIEW MODAL
============================================================ */

interface DetailViewModalProps {
  staffCase: StaffCriminalCase;
  onClose: () => void;
}

const DetailViewModal = ({ staffCase, onClose }: DetailViewModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg my-8 rounded-xl bg-white shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Staff Criminal Case Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="font-medium">Name:</span> {staffCase.name}</div>
            <div><span className="font-medium">Designation:</span> {staffCase.designation}</div>
            <div><span className="font-medium">Station:</span> {staffCase.station}</div>
            <div><span className="font-medium">Date of Reporting:</span> {formatDate(staffCase.date_of_reporting)}</div>
            <div className="col-span-2">
              <span className="font-medium">Nature of Offence:</span>
              <p className="mt-1 text-slate-600">{staffCase.nature_of_offence}</p>
            </div>
            <div className="col-span-2">
              <span className="font-medium">Court File Ref:</span>
              <p className="mt-1 text-slate-600">{staffCase.court_file_ref || '—'}</p>
            </div>
            <div>
              <span className="font-medium">Latest Action:</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getActionBadgeClass(staffCase.latest_action)}`}>
                {getActionLabel(staffCase.latest_action)}
              </span>
            </div>
            <div>
              <span className="font-medium">Hearing/Conviction Date:</span>
              <p className="mt-1 text-slate-600">{staffCase.hearing_conviction_date || '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN PAGE COMPONENT
============================================================ */

const AdminStaffCriminal = () => {
  const dispatch = useAppDispatch();

  const staffCases = useAppSelector(selectAllStaffCases);
  const pagination = useAppSelector(selectStaffCasesPagination);
  const filters = useAppSelector(selectStaffCasesFilters);
  const summary = useAppSelector(selectStaffCasesSummary);
  const listLoading = useAppSelector(selectStaffCasesListLoading);
  const mutating = useAppSelector(selectStaffCasesMutating);
  const error = useAppSelector(selectStaffCasesError);
  const selectedCase = useAppSelector(selectSelectedStaffCase);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffCriminalCase | null>(null);
  const [editingCase, setEditingCase] = useState<StaffCriminalCase | null>(null);
  const [viewingCase, setViewingCase] = useState<StaffCriminalCase | null>(null);
  const [searchInput, setSearchInput] = useState(filters.name ?? '');
  const [stationInput, setStationInput] = useState(filters.station ?? '');
  const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
  const [dateTo, setDateTo] = useState(filters.date_to ?? '');

  // Memoized filter object to prevent infinite re-renders
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  // Fetch data when filters change
  useEffect(() => {
    dispatch(fetchStaffCases(filters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filterKey]);

  // Debounced name search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.name) {
        dispatch(setFilters({ name: searchInput || undefined, page: 1 }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, dispatch, filters.name]);

  // Debounced station search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (stationInput !== filters.station) {
        dispatch(setFilters({ station: stationInput || undefined, page: 1 }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [stationInput, dispatch, filters.station]);

  // Debounced date filters
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setFilters({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page: 1,
      }));
    }, 400);
    return () => clearTimeout(timer);
  }, [dateFrom, dateTo, dispatch]);

  const handleFilterChange = useCallback((key: keyof typeof filters, val: string) => {
    dispatch(setFilters({ [key]: val || undefined, page: 1 }));
  }, [dispatch]);

  const handlePageChange = useCallback((page: number) => {
    dispatch(setFilters({ page }));
  }, [dispatch]);

  const openAdd = useCallback(() => {
    setEditingCase(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((staffCase: StaffCriminalCase) => {
    dispatch(fetchStaffCaseById(staffCase.id));
    setEditingCase(staffCase);
    setModalOpen(true);
  }, [dispatch]);

  const openView = useCallback((staffCase: StaffCriminalCase) => {
    setViewingCase(staffCase);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingCase(null);
    dispatch(clearSelectedCase());
  }, [dispatch]);

  const handleSubmit = useCallback(async (data: CreateStaffCaseDto) => {
    if (editingCase) {
      await dispatch(updateStaffCase({ id: editingCase.id, payload: data }));
    } else {
      await dispatch(createStaffCase(data));
    }
    closeModal();
  }, [dispatch, editingCase, closeModal]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await dispatch(deleteStaffCase(deleteTarget.id));
    setDeleteTarget(null);
  }, [dispatch, deleteTarget]);

  const handleReset = useCallback(() => {
    dispatch(resetFilters());
    setSearchInput('');
    setStationInput('');
    setDateFrom('');
    setDateTo('');
  }, [dispatch]);

  // Table headers matching Excel exactly
  const headers = [
    'Name',
    'Designation',
    'Station',
    'Date of Reporting',
    'Nature of Offence',
    'COURT FILE REF',
    'Latest Action',
    'Hearing/Conviction date',
    'Actions',
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Modals */}
      {modalOpen && (
        <StaffCaseModal
          initial={editingCase ? (selectedCase ?? editingCase) : null}
          onSubmit={handleSubmit}
          onClose={closeModal}
          loading={mutating}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          title="Delete staff criminal case"
          message={`This will permanently remove the record for "${deleteTarget.name}". This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
      {viewingCase && (
        <DetailViewModal
          staffCase={viewingCase}
          onClose={() => setViewingCase(null)}
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Staff Criminal Cases</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {pagination.total.toLocaleString()} record{pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Case
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Total Cases</p>
              <p className="text-2xl font-bold text-slate-900">{summary.total_cases}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Suspensions</p>
              <p className="text-2xl font-bold text-amber-600">{summary.suspension_count}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Interdictions</p>
              <p className="text-2xl font-bold text-red-600">{summary.interdiction_count}</p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <span>{error}</span>
            <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Filters row */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name…"
                className="pl-9 pr-3 py-2 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <input
              value={stationInput}
              onChange={(e) => setStationInput(e.target.value)}
              placeholder="Filter by station…"
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 w-40"
            />

            <select
              value={filters.latest_action ?? ''}
              onChange={(e) => handleFilterChange('latest_action', e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white"
            >
              <option value="">All actions</option>
              {EMPLOYMENT_ACTIONS.map((action) => (
                <option key={action} value={action}>{getActionLabel(action)}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 w-36"
              placeholder="Date from"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 w-36"
              placeholder="Date to"
            />

            <button
              onClick={handleReset}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition"
            >
              Reset filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1200px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {headers.map((header, idx) => (
                    <th key={idx} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td colSpan={headers.length} className="py-20 text-center">
                      <div className="flex justify-center"><Spinner size="md" /></div>
                    </td>
                  </tr>
                ) : staffCases.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="py-20 text-center text-slate-400">
                      No staff criminal cases found
                    </td>
                  </tr>
                ) : (
                  staffCases.map((staffCase) => (
                    <tr
                      key={staffCase.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer"
                      onClick={() => openView(staffCase)}
                    >
                      <td className="px-3 py-2 font-medium text-slate-700">{staffCase.name}</td>
                      <td className="px-3 py-2 text-slate-600">{staffCase.designation}</td>
                      <td className="px-3 py-2 text-slate-600">{staffCase.station}</td>
                      <td className="px-3 py-2">{formatDate(staffCase.date_of_reporting)}</td>
                      <td className="px-3 py-2 max-w-[250px] truncate" title={staffCase.nature_of_offence}>
                        {staffCase.nature_of_offence}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {staffCase.court_file_ref || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getActionBadgeClass(staffCase.latest_action)}`}>
                          {getActionLabel(staffCase.latest_action)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{staffCase.hearing_conviction_date || <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(staffCase)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(staffCase)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                       </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!listLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 rounded-md text-xs font-medium transition ${
                        p === pagination.page ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStaffCriminal;