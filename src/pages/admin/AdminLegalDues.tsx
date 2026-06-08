// AdminLegalDues.tsx

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  fetchLegalDues,
  createLegalDue,
  updateLegalDue,
  deleteLegalDue,
  addPayment,
  updateInterest,
  fetchDebtors,
  fetchFiscalYearSummary,
  setFilters,
  resetFilters,
  clearSelectedDue,
  clearError,
  fetchLegalDueById,
  selectAllLegalDues,
  selectLegalDuesPagination,
  selectLegalDuesFilters,
  selectLegalDuesListLoading,
  selectLegalDuesMutating,
  selectLegalDuesError,
  selectSelectedDue,
  selectLegalDuesSummary,
  selectAllDebtors,
  selectFiscalYearSummary,
  type LegalDue,
  type Debtor,
  type CreateLegalDuePayload,
  type LegalDuesType,
  type LegalDueStatus,
  type AddPaymentPayload,
} from '../../store/slices/legalduesSlice';
import { useAppDispatch, useAppSelector } from '../../store/hook';

/* ============================================================
   CONSTANTS
============================================================ */
const DUE_TYPES: LegalDuesType[] = ['award', 'external_counsel', 'arbitrator_fee'];
const DUE_STATUSES: LegalDueStatus[] = [
  'pending', 'partial', 'paid', 'disputed', 
  'in_negotiation', 'concluded_unpaid', 'under_collection'
];

const EMPTY_FORM: CreateLegalDuePayload = {
  type: 'award',
  debtor_ids: [],
  new_debtors: [],
  dispute_description: '',
  date_incurred: '',
  date_due: '',
  total_amount: 0,
  interest_rate: 0,
  interest_accrued: 0,
  status: 'pending',
  notes: '',
};

/* ============================================================
   HELPERS
============================================================ */
const formatCurrency = (amount: number) => 
  `KSh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (date: string | null) => {
  if (!date) return <span className="text-slate-300">—</span>;
  return new Date(date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmt = (val: string | null | undefined) =>
  val ? (
    <span className="truncate block max-w-[250px]" title={val}>
      {val}
    </span>
  ) : (
    <span className="text-slate-300">—</span>
  );

const getStatusBadgeClass = (status: LegalDueStatus): string => {
  const classes: Record<LegalDueStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    partial: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700',
    disputed: 'bg-red-100 text-red-700',
    in_negotiation: 'bg-purple-100 text-purple-700',
    concluded_unpaid: 'bg-orange-100 text-orange-700',
    under_collection: 'bg-rose-100 text-rose-700',
  };
  return classes[status] || 'bg-slate-100 text-slate-700';
};

const getStatusLabel = (status: LegalDueStatus): string => {
  const labels: Record<LegalDueStatus, string> = {
    pending: 'Pending',
    partial: 'Partially Paid',
    paid: 'Paid',
    disputed: 'Disputed',
    in_negotiation: 'In Negotiation',
    concluded_unpaid: 'Concluded Unpaid',
    under_collection: 'Under Collection',
  };
  return labels[status] || status;
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
   ADD PAYMENT MODAL
============================================================ */
interface AddPaymentModalProps {
  legalDue: LegalDue;
  onConfirm: (payment: AddPaymentPayload['payment']) => void;
  onCancel: () => void;
  loading: boolean;
}

const AddPaymentModal = ({ legalDue, onConfirm, onCancel, loading }: AddPaymentModalProps) => {
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fiscalYear, setFiscalYear] = useState<string>(`${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);
  const [reference, setReference] = useState<string>('');
  const [method, setMethod] = useState<string>('bank_transfer');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      amount_paid: amount,
      payment_date: paymentDate,
      fiscal_year: fiscalYear,
      payment_reference: reference || undefined,
      payment_method: method,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Add Payment</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 grid gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Legal Due</label>
            <input
              type="text"
              value={legalDue.debtors.map(d => d.name).join(', ')}
              disabled
              className="rounded-md border p-2 bg-slate-50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Amount Paid (KSh) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              className="rounded-md border p-2"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Payment Date *</label>
            <input
              type="date"
              required
              className="rounded-md border p-2"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Fiscal Year</label>
            <input
              type="text"
              placeholder="YYYY/YYYY"
              className="rounded-md border p-2"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Payment Reference</label>
            <input
              type="text"
              className="rounded-md border p-2"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Payment Method</label>
            <select
              className="rounded-md border p-2"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Notes</label>
            <textarea
              rows={2}
              className="rounded-md border p-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {loading && <Spinner />}
              Add Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   LEGAL DUE MODAL (ADD/EDIT)
============================================================ */
interface LegalDueModalProps {
  initial: LegalDue | null;
  debtorsList: Debtor[];
  onSubmit: (data: CreateLegalDuePayload) => void;
  onClose: () => void;
  loading: boolean;
}

const LegalDueModal = ({ initial, debtorsList, onSubmit, onClose, loading }: LegalDueModalProps) => {
  const isEdit = !!initial;
  const [form, setForm] = useState<CreateLegalDuePayload>(() =>
    initial
      ? {
          reference_number: initial.reference_number ?? '',
          type: initial.type,
          debtor_ids: initial.debtors.map(d => d.id),
          new_debtors: [],
          dispute_description: initial.dispute_description ?? '',
          date_incurred: initial.date_incurred?.split('T')[0] ?? '',
          date_due: initial.date_due?.split('T')[0] ?? '',
          total_amount: initial.total_amount,
          interest_rate: initial.interest_rate ?? 0,
          interest_accrued: initial.interest_accrued,
          status: initial.status,
          notes: initial.notes ?? '',
        }
      : { ...EMPTY_FORM }
  );
  
  const [newDebtorName, setNewDebtorName] = useState('');

  const handleAddNewDebtor = () => {
    if (newDebtorName.trim()) {
      setForm({
        ...form,
        new_debtors: [...(form.new_debtors || []), { name: newDebtorName.trim(), is_individual: true }],
      });
      setNewDebtorName('');
    }
  };

  const handleRemoveNewDebtor = (index: number) => {
    const updated = [...(form.new_debtors || [])];
    updated.splice(index, 1);
    setForm({ ...form, new_debtors: updated });
  };

  const handleToggleDebtor = (debtorId: number) => {
    const current = form.debtor_ids || [];
    if (current.includes(debtorId)) {
      setForm({ ...form, debtor_ids: current.filter(id => id !== debtorId) });
    } else {
      setForm({ ...form, debtor_ids: [...current, debtorId] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl my-8 rounded-xl bg-white shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Legal Due' : 'Add Legal Due'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Reference Number</label>
              <input
                className="rounded-md border p-2"
                value={form.reference_number || ''}
                onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                placeholder="e.g., HC JR NO. E280/2024"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Type *</label>
              <select
                className="rounded-md border p-2"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as LegalDuesType })}
              >
                {DUE_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Debtors Section */}
            <div className="col-span-full">
              <label className="text-xs font-medium mb-1 block">Debtors *</label>
              <div className="border rounded-md p-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {debtorsList.map((debtor) => (
                    <label key={debtor.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(form.debtor_ids || []).includes(debtor.id)}
                        onChange={() => handleToggleDebtor(debtor.id)}
                      />
                      {debtor.name}
                    </label>
                  ))}
                </div>
                <div className="border-t pt-3 mt-2">
                  <p className="text-xs text-slate-500 mb-2">Add new debtor:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-md border p-2 text-sm"
                      placeholder="Debtor name"
                      value={newDebtorName}
                      onChange={(e) => setNewDebtorName(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleAddNewDebtor}
                      className="px-3 py-2 text-sm bg-slate-100 rounded-md hover:bg-slate-200"
                    >
                      Add
                    </button>
                  </div>
                  {(form.new_debtors || []).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {form.new_debtors?.map((d, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded">
                          <span>{d.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewDebtor(idx)}
                            className="text-red-500 text-xs hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-full">
              <label className="text-xs font-medium">Dispute Description</label>
              <textarea
                rows={2}
                className="rounded-md border p-2 w-full"
                value={form.dispute_description}
                onChange={(e) => setForm({ ...form, dispute_description: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Date Incurred</label>
              <input
                type="date"
                className="rounded-md border p-2"
                value={form.date_incurred}
                onChange={(e) => setForm({ ...form, date_incurred: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Date Due</label>
              <input
                type="date"
                className="rounded-md border p-2"
                value={form.date_due}
                onChange={(e) => setForm({ ...form, date_due: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Total Amount (KSh) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-md border p-2"
                value={form.total_amount}
                onChange={(e) => setForm({ ...form, total_amount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Interest Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="rounded-md border p-2"
                value={form.interest_rate}
                onChange={(e) => setForm({ ...form, interest_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Interest Accrued (KSh)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-md border p-2"
                value={form.interest_accrued}
                onChange={(e) => setForm({ ...form, interest_accrued: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Status</label>
              <select
                className="rounded-md border p-2"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as LegalDueStatus })}
              >
                {DUE_STATUSES.map((s) => (
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                ))}
              </select>
            </div>

            <div className="col-span-full">
              <label className="text-xs font-medium">Notes</label>
              <textarea
                rows={2}
                className="rounded-md border p-2 w-full"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
  legalDue: LegalDue;
  onClose: () => void;
  onAddPayment: () => void;
  onUpdateInterest: (amount: number) => void;
  loading: boolean;
}

const DetailViewModal = ({ legalDue, onClose, onAddPayment, onUpdateInterest, loading }: DetailViewModalProps) => {
  const [interestAmount, setInterestAmount] = useState<number>(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl my-8 rounded-xl bg-white shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Legal Due Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="font-medium">Reference:</span> {fmt(legalDue.reference_number)}</div>
            <div><span className="font-medium">Type:</span> {legalDue.type.replace('_', ' ')}</div>
            <div className="col-span-2"><span className="font-medium">Debtors:</span> {legalDue.debtors.map(d => d.name).join(', ')}</div>
            <div><span className="font-medium">Date Incurred:</span> {formatDate(legalDue.date_incurred)}</div>
            <div><span className="font-medium">Date Due:</span> {formatDate(legalDue.date_due)}</div>
            <div><span className="font-medium">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeClass(legalDue.status)}`}>{getStatusLabel(legalDue.status)}</span></div>
          </div>

          {/* Amounts */}
          <div className="bg-slate-50 p-3 rounded-lg grid grid-cols-2 gap-3 text-sm">
            <div><span className="font-medium">Total Amount:</span> {formatCurrency(legalDue.total_amount)}</div>
            <div><span className="font-medium">Interest Rate:</span> {legalDue.interest_rate ?? 0}%</div>
            <div><span className="font-medium">Interest Accrued:</span> {formatCurrency(legalDue.interest_accrued)}</div>
            <div><span className="font-medium">Paid Amount:</span> {formatCurrency(legalDue.paid_amount)}</div>
            <div><span className="font-medium">Outstanding:</span> <span className="text-red-600 font-bold">{formatCurrency(legalDue.outstanding_amount)}</span></div>
          </div>

          {/* Description */}
          {legalDue.dispute_description && (
            <div>
              <span className="font-medium text-sm">Dispute Description:</span>
              <p className="text-sm text-slate-600 mt-1">{legalDue.dispute_description}</p>
            </div>
          )}

          {/* Case References */}
          {legalDue.cases.length > 0 && (
            <div>
              <span className="font-medium text-sm">Case References:</span>
              <div className="mt-1 space-y-1">
                {legalDue.cases.map((c) => (
                  <div key={c.id} className="text-sm text-slate-600">
                    {c.court_file_ref && <div>File: {c.court_file_ref}</div>}
                    {c.court_station && <div>Court: {c.court_station}</div>}
                    {c.judgment_date && <div>Judgment: {formatDate(c.judgment_date)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments */}
          {legalDue.payments.length > 0 && (
            <div>
              <span className="font-medium text-sm">Payment History:</span>
              <table className="w-full text-sm mt-2 border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Date</th>
                    <th className="text-left py-1">Amount</th>
                    <th className="text-left py-1">Fiscal Year</th>
                    <th className="text-left py-1">Reference</th>
                   </tr>
                </thead>
                <tbody>
                  {legalDue.payments.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="py-1">{formatDate(p.payment_date)}</td>
                      <td className="py-1">{formatCurrency(p.amount_paid)}</td>
                      <td className="py-1">{p.fiscal_year || '—'}</td>
                      <td className="py-1">{p.payment_reference || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          {legalDue.notes && (
            <div>
              <span className="font-medium text-sm">Notes:</span>
              <p className="text-sm text-slate-600 mt-1">{legalDue.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onAddPayment}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Add Payment
            </button>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Interest amount"
                className="rounded-md border p-2 text-sm w-32"
                value={interestAmount}
                onChange={(e) => setInterestAmount(parseFloat(e.target.value) || 0)}
              />
              <button
                onClick={() => onUpdateInterest(interestAmount)}
                disabled={loading || interestAmount <= 0}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                Add Interest
              </button>
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
const AdminLegalDues = () => {
  const dispatch = useAppDispatch();

  const dues = useAppSelector(selectAllLegalDues);
  const pagination = useAppSelector(selectLegalDuesPagination);
  const filters = useAppSelector(selectLegalDuesFilters);
  const summary = useAppSelector(selectLegalDuesSummary);
  const debtorsList = useAppSelector(selectAllDebtors);
  const fiscalYearSummary = useAppSelector(selectFiscalYearSummary);
  const listLoading = useAppSelector(selectLegalDuesListLoading);
  const mutating = useAppSelector(selectLegalDuesMutating);
  const error = useAppSelector(selectLegalDuesError);
  const selectedDue = useAppSelector(selectSelectedDue);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LegalDue | null>(null);
  const [editingDue, setEditingDue] = useState<LegalDue | null>(null);
  const [viewingDue, setViewingDue] = useState<LegalDue | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.debtor_name ?? '');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(`${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);

  // Memoized filter object to prevent infinite re-renders
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchLegalDues(filters));
    dispatch(fetchDebtors());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Fetch fiscal year summary when selected
  useEffect(() => {
    if (selectedFiscalYear) {
      dispatch(fetchFiscalYearSummary(selectedFiscalYear));
    }
  }, [dispatch, selectedFiscalYear]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.debtor_name) {
        dispatch(setFilters({ debtor_name: searchInput || undefined, page: 1 }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, dispatch, filters.debtor_name]);

  const handleFilterChange = useCallback((key: keyof typeof filters, val: string) => {
    dispatch(setFilters({ [key]: val || undefined, page: 1 }));
  }, [dispatch]);

  const handlePageChange = useCallback((page: number) => {
    dispatch(setFilters({ page }));
  }, [dispatch]);

  const openAdd = useCallback(() => {
    setEditingDue(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((due: LegalDue) => {
    dispatch(fetchLegalDueById(due.id));
    setEditingDue(due);
    setModalOpen(true);
  }, [dispatch]);

  const openView = useCallback((due: LegalDue) => {
    setViewingDue(due);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingDue(null);
    dispatch(clearSelectedDue());
  }, [dispatch]);

  const handleSubmit = useCallback(async (data: CreateLegalDuePayload) => {
    if (editingDue) {
      await dispatch(updateLegalDue({ id: editingDue.id, payload: data }));
    } else {
      await dispatch(createLegalDue(data));
    }
    closeModal();
  }, [dispatch, editingDue, closeModal]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await dispatch(deleteLegalDue(deleteTarget.id));
    setDeleteTarget(null);
  }, [dispatch, deleteTarget]);

  const handleAddPayment = useCallback(async (payment: AddPaymentPayload['payment']) => {
    if (!viewingDue) return;
    await dispatch(addPayment({ legal_due_id: viewingDue.id, payment }));
    setPaymentModalOpen(false);
    setViewingDue(null);
  }, [dispatch, viewingDue]);

  const handleUpdateInterest = useCallback(async (amount: number) => {
    if (!viewingDue) return;
    await dispatch(updateInterest({ id: viewingDue.id, additionalInterest: amount }));
    setViewingDue(null);
  }, [dispatch, viewingDue]);

  const handleReset = useCallback(() => {
    dispatch(resetFilters());
    setSearchInput('');
  }, [dispatch]);

  // Table headers
  const headers = [
    'Reference',
    'Debtor(s)',
    'Type',
    'Dispute',
    'Date Incurred',
    'Total Amount',
    'Paid',
    'Outstanding',
    'Status',
    'Actions',
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {modalOpen && (
        <LegalDueModal
          initial={editingDue ? (selectedDue ?? editingDue) : null}
          debtorsList={debtorsList}
          onSubmit={handleSubmit}
          onClose={closeModal}
          loading={mutating}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          title="Delete legal due record"
          message={`This will permanently remove the record for "${deleteTarget.debtors.map(d => d.name).join(', ')}". This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
      {paymentModalOpen && viewingDue && (
        <AddPaymentModal
          legalDue={viewingDue}
          onConfirm={handleAddPayment}
          onCancel={() => setPaymentModalOpen(false)}
          loading={mutating}
        />
      )}
      {viewingDue && !paymentModalOpen && (
        <DetailViewModal
          legalDue={viewingDue}
          onClose={() => setViewingDue(null)}
          onAddPayment={() => setPaymentModalOpen(true)}
          onUpdateInterest={handleUpdateInterest}
          loading={mutating}
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Summary Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Legal Dues</h1>
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
            Add record
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_outstanding_all)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Total Paid</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.total_paid_all)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Total Interest Accrued</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.total_interest_accrued_all)}</p>
            </div>
          </div>
        )}

        {/* Fiscal Year Summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Fiscal Year:</label>
              <input
                type="text"
                placeholder="YYYY/YYYY"
                className="rounded-md border p-2 text-sm w-32"
                value={selectedFiscalYear}
                onChange={(e) => setSelectedFiscalYear(e.target.value)}
              />
            </div>
            {fiscalYearSummary && (
              <div className="flex gap-4 text-sm">
                <span>Payments: <strong>{formatCurrency(fiscalYearSummary.total_payments)}</strong></span>
                <span>Transactions: <strong>{fiscalYearSummary.payment_count}</strong></span>
                <span>Legal Dues: <strong>{fiscalYearSummary.legal_dues_affected}</strong></span>
              </div>
            )}
          </div>
        </div>

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
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by debtor name…"
                className="pl-9 pr-3 py-2 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filters.type ?? ''}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white"
            >
              <option value="">All types</option>
              {DUE_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>

            <select
              value={filters.status ?? ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white"
            >
              <option value="">All statuses</option>
              {DUE_STATUSES.map((s) => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Min outstanding"
              value={filters.min_outstanding ?? ''}
              onChange={(e) => handleFilterChange('min_outstanding', e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 w-36"
            />
            <input
              type="number"
              placeholder="Max outstanding"
              value={filters.max_outstanding ?? ''}
              onChange={(e) => handleFilterChange('max_outstanding', e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 w-36"
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
                ) : dues.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="py-20 text-center text-slate-400">
                      No records found
                    </td>
                  </tr>
                ) : (
                  dues.map((due) => (
                    <tr 
                      key={due.id} 
                      className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer" 
                      onClick={() => openView(due)}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{fmt(due.reference_number)}</td>
                      <td className="px-3 py-2 font-medium text-slate-700">
                        {due.debtors.map(d => d.name).join(', ')}
                      </td>
                      <td className="px-3 py-2">
                        <span className="capitalize">{due.type.replace('_', ' ')}</span>
                      </td>
                      <td className="px-3 py-2 max-w-[250px] truncate">{fmt(due.dispute_description)}</td>
                      <td className="px-3 py-2">{formatDate(due.date_incurred)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(due.total_amount)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(due.paid_amount)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${due.outstanding_amount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatCurrency(due.outstanding_amount)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeClass(due.status)}`}>
                          {getStatusLabel(due.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(due)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(due)}
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

export default AdminLegalDues;