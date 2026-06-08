import { useEffect, useState, useCallback } from 'react';
import {
  fetchCourtCases,
  createCourtCase,
  updateCourtCase,
  deleteCourtCase,
  setFilters,
  resetFilters,
  clearSelectedCase,
  clearError,
  fetchCourtCaseById,
  selectAllCourtCases,
  selectCourtCasePagination,
  selectCourtCaseFilters,
  selectCourtCaseListLoading,
  selectCourtCaseMutating,
  selectCourtCaseError,
  selectSelectedCase,
  type CourtCase,
  type CreateCourtCasePayload,
  type CaseStatus,
  type CaseType,
  type CaseCategory,
  type RepresentationType,
} from '../../store/slices/courtCaseSlice';
import { useAppDispatch, useAppSelector } from '../../store/hook';

/* ============================================================
   CONSTANTS
============================================================ */
const CASE_STATUSES: CaseStatus[] = ['Ongoing', 'Concluded'];
const CASE_TYPES: CaseType[] = ['Court', 'Arbitration', 'PPRB'];
const CATEGORIES: CaseCategory[] = [
  'Judicial Decisions', 'Procurement', 'Constitutional',
  'Construction', 'Accident', 'Employment', 'Land', 'Miscellaneous',
];
const REPRESENTATIONS: RepresentationType[] = ['State Law', 'In House', 'External', 'EACC'];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1999 }, (_, i) => CURRENT_YEAR - i);

const EMPTY_FORM: CreateCourtCasePayload = {
  ocrj_file_ref: '',
  year: CURRENT_YEAR,
  type_of_case: 'Court',
  date_of_filing: '',
  court_station: '',
  court_file_ref: '',
  plaintiff: '',
  defendant: '',
  claim: '',
  category: undefined,
  judiciary_representation: undefined,
  counsel_name: '',
  opposing_counsel: '',
  latest_update: '',
  status: undefined,
  outcome: '',
  legal_fees: undefined,
};

/* ============================================================
   HELPERS
============================================================ */
const statusBadge = (status: CaseStatus | null | undefined) => {
  if (!status) return <span className="text-xs text-slate-400 italic">—</span>;
  const styles: Record<CaseStatus, string> = {
    Ongoing: 'bg-amber-50 text-amber-700 border border-amber-200',
    Concluded: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

const typeBadge = (type: CaseType) => {
  const styles: Record<CaseType, string> = {
    Court: 'bg-blue-50 text-blue-700 border border-blue-200',
    Arbitration: 'bg-purple-50 text-purple-700 border border-purple-200',
    PPRB: 'bg-slate-100 text-slate-600 border border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>
      {type}
    </span>
  );
};

const fmt = (val: string | number | null | undefined) =>
  val ? <span className="truncate block max-w-[180px]" title={String(val)}>{val}</span> : <span className="text-slate-300">—</span>;

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return <span className="text-slate-300">—</span>;
  const d = new Date(date);
  if (isNaN(d.getTime())) return <span className="text-slate-300">—</span>;
  return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ============================================================
   SUB-COMPONENTS
============================================================ */

// ── Spinner ──────────────────────────────────────────────────
const Spinner = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => (
  <svg
    className={`animate-spin ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} text-current`}
    fill="none" viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

// ── Form Field (reused from original) ─────────────────────────
const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';
const selectCls = `${inputCls} cursor-pointer`;

// ── Confirm Delete Modal (unchanged) ──────────────────────────
const DeleteModal = ({
  caseItem,
  onConfirm,
  onCancel,
  loading,
}: {
  caseItem: CourtCase;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-100 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900">Delete court case</h3>
          <p className="mt-1 text-sm text-slate-500">
            This will permanently remove{' '}
            <span className="font-medium text-slate-700">{caseItem.ocrj_file_ref}</span>.
            This action cannot be undone.
          </p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition"
        >
          {loading && <Spinner />}
          Delete case
        </button>
      </div>
    </div>
  </div>
);

// ── Add / Edit Modal (unchanged, already contains all fields) ──
const CaseModal = ({
  initial,
  onSubmit,
  onClose,
  loading,
}: {
  initial?: CourtCase | null;
  onSubmit: (data: CreateCourtCasePayload) => void;
  onClose: () => void;
  loading: boolean;
}) => {
  const isEdit = !!initial;

  const [form, setForm] = useState<CreateCourtCasePayload>(() =>
    initial
      ? {
          ocrj_file_ref: initial.ocrj_file_ref,
          year: initial.year,
          type_of_case: initial.type_of_case,
          date_of_filing: initial.date_of_filing?.split('T')[0] ?? '',
          court_station: initial.court_station ?? '',
          court_file_ref: initial.court_file_ref ?? '',
          plaintiff: initial.plaintiff ?? '',
          defendant: initial.defendant ?? '',
          claim: initial.claim ?? '',
          category: initial.category ?? undefined,
          judiciary_representation: initial.judiciary_representation ?? undefined,
          counsel_name: initial.counsel_name ?? '',
          opposing_counsel: initial.opposing_counsel ?? '',
          latest_update: initial.latest_update ?? '',
          status: initial.status ?? undefined,
          outcome: initial.outcome ?? '',
          legal_fees: initial.legal_fees ?? undefined,
        }
      : { ...EMPTY_FORM }
  );

  const [errors, setErrors] = useState<Partial<Record<keyof CreateCourtCasePayload, string>>>({});

  const set = <K extends keyof CreateCourtCasePayload>(key: K, val: CreateCourtCasePayload[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.ocrj_file_ref.trim()) errs.ocrj_file_ref = 'Required';
    if (!form.year) errs.year = 'Required';
    if (!form.type_of_case) errs.type_of_case = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const cleaned = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? undefined : v])
    ) as CreateCourtCasePayload;
    onSubmit(cleaned);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl my-8 rounded-xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? 'Edit court case' : 'Add new court case'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? `Editing ${initial?.ocrj_file_ref}` : 'Fill in the required fields to log a new case'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="OCRJ File Ref" required>
              <input className={inputCls} value={form.ocrj_file_ref}
                onChange={(e) => set('ocrj_file_ref', e.target.value)} placeholder="e.g. ELRCPET E143/2026" />
              {errors.ocrj_file_ref && <span className="text-xs text-red-500">{errors.ocrj_file_ref}</span>}
            </Field>
            <Field label="Court File Ref">
              <input className={inputCls} value={form.court_file_ref ?? ''}
                onChange={(e) => set('court_file_ref', e.target.value)} placeholder="e.g. Civil Case No. 12/2026" />
            </Field>
            <Field label="Type of Case" required>
              <select className={selectCls} value={form.type_of_case}
                onChange={(e) => set('type_of_case', e.target.value as CaseType)}>
                {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Year" required>
              <select className={selectCls} value={form.year}
                onChange={(e) => set('year', Number(e.target.value))}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Date of Filing">
              <input type="date" className={inputCls} value={form.date_of_filing ?? ''}
                onChange={(e) => set('date_of_filing', e.target.value)} />
            </Field>
            <Field label="Court Station">
              <input className={inputCls} value={form.court_station ?? ''}
                onChange={(e) => set('court_station', e.target.value)} placeholder="e.g. Milimani ELRC" />
            </Field>
            <Field label="Plaintiff / Petitioner">
              <input className={inputCls} value={form.plaintiff ?? ''}
                onChange={(e) => set('plaintiff', e.target.value)} placeholder="Name or entity" />
            </Field>
            <Field label="Defendant / Respondent">
              <input className={inputCls} value={form.defendant ?? ''}
                onChange={(e) => set('defendant', e.target.value)} placeholder="Name or entity" />
            </Field>
            <Field label="Category">
              <select className={selectCls} value={form.category ?? ''}
                onChange={(e) => set('category', (e.target.value as CaseCategory) || undefined)}>
                <option value="">— Select —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Judiciary Representation">
              <select className={selectCls} value={form.judiciary_representation ?? ''}
                onChange={(e) => set('judiciary_representation', (e.target.value as RepresentationType) || undefined)}>
                <option value="">— Select —</option>
                {REPRESENTATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Counsel Name">
              <input className={inputCls} value={form.counsel_name ?? ''}
                onChange={(e) => set('counsel_name', e.target.value)} placeholder="Advocate name" />
            </Field>
            <Field label="Opposing Counsel">
              <input className={inputCls} value={form.opposing_counsel ?? ''}
                onChange={(e) => set('opposing_counsel', e.target.value)} placeholder="Opposing advocate" />
            </Field>
            <Field label="Status">
              <select className={selectCls} value={form.status ?? ''}
                onChange={(e) => set('status', (e.target.value as CaseStatus) || undefined)}>
                <option value="">— Select —</option>
                {CASE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Legal Fees (KSh)">
              <input type="number" min={0} className={inputCls}
                value={form.legal_fees ?? ''}
                onChange={(e) => set('legal_fees', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0.00" />
            </Field>
            <div className="col-span-full">
              <Field label="Claim / Nature of Dispute">
                <textarea rows={2} className={`${inputCls} resize-none`} value={form.claim ?? ''}
                  onChange={(e) => set('claim', e.target.value)}
                  placeholder="Brief description of the claim…" />
              </Field>
            </div>
            <div className="col-span-full">
              <Field label="Latest Update">
                <textarea rows={2} className={`${inputCls} resize-none`} value={form.latest_update ?? ''}
                  onChange={(e) => set('latest_update', e.target.value)}
                  placeholder="Most recent development or hearing note…" />
              </Field>
            </div>
            <div className="col-span-full">
              <Field label="Outcome">
                <textarea rows={2} className={`${inputCls} resize-none`} value={form.outcome ?? ''}
                  onChange={(e) => set('outcome', e.target.value)}
                  placeholder="Final outcome or judgment summary (if concluded)…" />
              </Field>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition">
              {loading && <Spinner />}
              {isEdit ? 'Save changes' : 'Add case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN PAGE (UPDATED TABLE)
============================================================ */
const AdminCourtCases = () => {
  const dispatch = useAppDispatch();

  const cases       = useAppSelector(selectAllCourtCases);
  const pagination  = useAppSelector(selectCourtCasePagination);
  const filters     = useAppSelector(selectCourtCaseFilters);
  const listLoading = useAppSelector(selectCourtCaseListLoading);
  const mutating    = useAppSelector(selectCourtCaseMutating);
  const error       = useAppSelector(selectCourtCaseError);
  const selectedCase = useAppSelector(selectSelectedCase);

  const [modalOpen, setModalOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourtCase | null>(null);
  const [editingCase, setEditingCase]   = useState<CourtCase | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  useEffect(() => {
    dispatch(fetchCourtCases(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(setFilters({ search: searchInput || undefined, page: 1 }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, dispatch]);

  const handleFilterChange = useCallback(
    (key: keyof typeof filters, val: string) => {
      dispatch(setFilters({ [key]: val || undefined, page: 1 }));
    },
    [dispatch]
  );

  const handlePageChange = (page: number) => dispatch(setFilters({ page }));

  const openAdd = () => { setEditingCase(null); setModalOpen(true); };
  const openEdit = (c: CourtCase) => {
    dispatch(fetchCourtCaseById(c.id));
    setEditingCase(c);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingCase(null);
    dispatch(clearSelectedCase());
  };

  const handleSubmit = async (data: CreateCourtCasePayload) => {
    if (editingCase) {
      await dispatch(updateCourtCase({ id: editingCase.id, payload: data }));
    } else {
      await dispatch(createCourtCase(data));
    }
    closeModal();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteCourtCase(deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleReset = () => {
    dispatch(resetFilters());
    setSearchInput('');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {modalOpen && (
        <CaseModal
          initial={editingCase ? (selectedCase ?? editingCase) : null}
          onSubmit={handleSubmit}
          onClose={closeModal}
          loading={mutating}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          caseItem={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Court Cases</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {pagination.total.toLocaleString()} case{pagination.total !== 1 ? 's' : ''} in register
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-95 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add case
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <span>{error}</span>
            <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Filters row (unchanged) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by party, file ref…"
                className="pl-9 pr-3 py-2 w-full rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <select
              value={filters.status ?? ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All statuses</option>
              {CASE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filters.type_of_case ?? ''}
              onChange={(e) => handleFilterChange('type_of_case', e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All types</option>
              {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filters.category ?? ''}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filters.judiciary_representation ?? ''}
              onChange={(e) => handleFilterChange('judiciary_representation', e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All counsel</option>
              {REPRESENTATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={filters.year ?? ''}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All years</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={handleReset}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition whitespace-nowrap"
            >
              Reset filters
            </button>
          </div>
        </div>

        {/* Table with ALL columns */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1200px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">OCRJ Ref</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Filing Date</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Court Station</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Court File Ref</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Plaintiff</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Defendant</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Claim</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Judiciary Rep</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Counsel</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Opposing Counsel</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Latest Update</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Outcome</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Legal Fees (KSh)</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td colSpan={18} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Spinner size="md" />
                        <span className="text-sm">Loading cases…</span>
                      </div>
                    </td>
                  </tr>
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-500">No cases found</span>
                        <span className="text-xs text-slate-400">Try adjusting your filters or add a new case</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2 font-medium text-blue-700 whitespace-nowrap">{c.ocrj_file_ref}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{c.year}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatDate(c.date_of_filing)}</td>
                      <td className="px-3 py-2">{typeBadge(c.type_of_case)}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[150px] truncate" title={c.court_station ?? ''}>{fmt(c.court_station)}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[150px] truncate" title={c.court_file_ref ?? ''}>{fmt(c.court_file_ref)}</td>
                      <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate" title={c.plaintiff ?? ''}>{fmt(c.plaintiff)}</td>
                      <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate" title={c.defendant ?? ''}>{fmt(c.defendant)}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={c.claim ?? ''}>{fmt(c.claim)}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmt(c.category)}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmt(c.judiciary_representation)}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[150px] truncate" title={c.counsel_name ?? ''}>{fmt(c.counsel_name)}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[150px] truncate" title={c.opposing_counsel ?? ''}>{fmt(c.opposing_counsel)}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={c.latest_update ?? ''}>{fmt(c.latest_update)}</td>
                      <td className="px-3 py-2">{statusBadge(c.status)}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={c.outcome ?? ''}>{fmt(c.outcome)}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                        {c.legal_fees ? `KSh ${c.legal_fees.toLocaleString()}` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                Showing {((pagination.page - 1) * pagination.limit) + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
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
                        p === pagination.page
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
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

export default AdminCourtCases;