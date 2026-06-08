// pages/AdminDemands.tsx

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  fetchDemands,
  createDemand,
  updateDemand,
  deleteDemand,
  addDemandActivity,
  fetchDemandActivities,
  addDemandDocument,
  fetchDemandDocuments,
  deleteDemandDocument,
  issueCrossDemand,
  setFilters,
  resetFilters,
  clearSelectedDemand,
  clearError,
  fetchDemandById,
  selectAllDemands,
  selectDemandsPagination,
  selectDemandsFilters,
  selectDemandsListLoading,
  selectDemandsMutating,
  selectDemandsError,
  selectSelectedDemand,
  selectDemandsSummary,
  selectDemandActivities,
  selectDemandDocuments,
  selectDemandsActivitiesLoading,
  selectDemandsDocumentsLoading,
  type Demand,
  type DemandStatus,
  type DemandDirection,
  type CreateDemandDto,
  type AddDemandActivityDto,
  type IssueCrossDemandDto,
  type DemandActivity,
  type DemandDocument,
} from '../../store/slices/demandsSlice';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { formatCurrency, getStatusBadgeClass, getStatusLabel, getDirectionBadgeClass, getDirectionLabel } from '../../store/slices/demandsSlice';

/* ============================================================
   CONSTANTS
============================================================ */

const DEMAND_STATUSES: DemandStatus[] = [
  'pending', 'in_negotiation', 'disputed', 'counter_demand',
  'settled', 'escalated', 'rejected', 'drafting_response', 'awaiting_legal_advice'
];

const DEMAND_DIRECTIONS: DemandDirection[] = ['incoming', 'outgoing'];

const ACTIVITY_TYPES = ['email', 'meeting', 'letter', 'phone_call', 'internal_note'];

const EMPTY_FORM: CreateDemandDto = {
  direction: 'incoming',
  claimant_name: '',
  respondent_name: 'The Judiciary',
  nature_of_dispute: '',
  amount_claimed: undefined,
  amount_settled: 0,
  currency: 'KES',
  status: 'pending',
  status_notes: '',
  date_received: new Date().toISOString().split('T')[0],
  response_deadline: '',
  reference_number: '',
  our_reference: '',
  assigned_to: '',
  notes: '',
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
   DEMAND MODAL (ADD/EDIT)
============================================================ */

interface DemandModalProps {
  initial: Demand | null;
  onSubmit: (data: CreateDemandDto) => void;
  onClose: () => void;
  loading: boolean;
}

const DemandModal = ({ initial, onSubmit, onClose, loading }: DemandModalProps) => {
  const isEdit = !!initial;
  const [form, setForm] = useState<CreateDemandDto>(() =>
    initial
      ? {
          direction: initial.direction,
          claimant_name: initial.claimant_name,
          respondent_name: initial.respondent_name,
          nature_of_dispute: initial.nature_of_dispute,
          amount_claimed: initial.amount_claimed ?? undefined,
          amount_settled: initial.amount_settled,
          currency: initial.currency,
          status: initial.status,
          status_notes: initial.status_notes ?? '',
          date_received: initial.date_received.split('T')[0],
          response_deadline: initial.response_deadline?.split('T')[0] ?? '',
          reference_number: initial.reference_number ?? '',
          our_reference: initial.our_reference ?? '',
          assigned_to: initial.assigned_to ?? '',
          notes: initial.notes ?? '',
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
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Demand' : 'Add Demand'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Direction *</label>
              <select
                className="rounded-md border p-2"
                value={form.direction}
                onChange={(e) => setForm({ ...form, direction: e.target.value as DemandDirection })}
              >
                {DEMAND_DIRECTIONS.map((d) => (
                  <option key={d} value={d}>{getDirectionLabel(d)}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Status *</label>
              <select
                className="rounded-md border p-2"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as DemandStatus })}
              >
                {DEMAND_STATUSES.map((s) => (
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Claimant Name *</label>
              <input
                className="rounded-md border p-2"
                value={form.claimant_name}
                onChange={(e) => setForm({ ...form, claimant_name: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Respondent Name *</label>
              <input
                className="rounded-md border p-2"
                value={form.respondent_name}
                onChange={(e) => setForm({ ...form, respondent_name: e.target.value })}
                required
              />
            </div>

            <div className="col-span-full">
              <label className="text-xs font-medium">Nature of Dispute *</label>
              <textarea
                rows={2}
                className="rounded-md border p-2 w-full"
                value={form.nature_of_dispute}
                onChange={(e) => setForm({ ...form, nature_of_dispute: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Amount Claimed (KSh)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-md border p-2"
                value={form.amount_claimed ?? ''}
                onChange={(e) => setForm({ ...form, amount_claimed: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Amount Settled (KSh)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-md border p-2"
                value={form.amount_settled}
                onChange={(e) => setForm({ ...form, amount_settled: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Date Received *</label>
              <input
                type="date"
                className="rounded-md border p-2"
                value={form.date_received}
                onChange={(e) => setForm({ ...form, date_received: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Response Deadline</label>
              <input
                type="date"
                className="rounded-md border p-2"
                value={form.response_deadline}
                onChange={(e) => setForm({ ...form, response_deadline: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Reference Number</label>
              <input
                className="rounded-md border p-2"
                value={form.reference_number}
                onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                placeholder="Claimant's reference"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Our Reference</label>
              <input
                className="rounded-md border p-2"
                value={form.our_reference}
                onChange={(e) => setForm({ ...form, our_reference: e.target.value })}
                placeholder="Internal reference"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Assigned To</label>
              <input
                className="rounded-md border p-2"
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                placeholder="Person handling this demand"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Status Notes</label>
              <input
                className="rounded-md border p-2"
                value={form.status_notes}
                onChange={(e) => setForm({ ...form, status_notes: e.target.value })}
              />
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
   ACTIVITY MODAL
============================================================ */

interface ActivityModalProps {
  demandId: number;
  onConfirm: (activity: AddDemandActivityDto) => void;
  onCancel: () => void;
  loading: boolean;
}

const ActivityModal = ({ demandId, onConfirm, onCancel, loading }: ActivityModalProps) => {
  const [form, setForm] = useState<AddDemandActivityDto>({
    demand_id: demandId,
    activity_type: 'internal_note',
    activity_date: new Date().toISOString().split('T')[0],
    description: '',
    performed_by: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Add Activity</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 grid gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Activity Type *</label>
            <select
              className="rounded-md border p-2"
              value={form.activity_type}
              onChange={(e) => setForm({ ...form, activity_type: e.target.value })}
              required
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Activity Date *</label>
            <input
              type="date"
              className="rounded-md border p-2"
              value={form.activity_date}
              onChange={(e) => setForm({ ...form, activity_date: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Description *</label>
            <textarea
              rows={3}
              className="rounded-md border p-2 w-full"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Performed By</label>
            <input
              className="rounded-md border p-2"
              value={form.performed_by}
              onChange={(e) => setForm({ ...form, performed_by: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {loading && <Spinner />}
              Add Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   CROSS DEMAND MODAL
============================================================ */

interface CrossDemandModalProps {
  onConfirm: (data: IssueCrossDemandDto) => void;
  onCancel: () => void;
  loading: boolean;
}

const CrossDemandModal = ({ onConfirm, onCancel, loading }: CrossDemandModalProps) => {
  const [amount, setAmount] = useState<number>(0);
  const [details, setDetails] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({ cross_demand_amount: amount, cross_demand_details: details });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Issue Cross-Demand</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 grid gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Cross-Demand Amount (KSh) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="rounded-md border p-2"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Details *</label>
            <textarea
              rows={3}
              className="rounded-md border p-2 w-full"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50">
              {loading && <Spinner />}
              Issue Cross-Demand
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
  demand: Demand;
  onClose: () => void;
  onAddActivity: () => void;
  onAddDocument: () => void;
  onDeleteDocument: (documentId: number) => void;
  onIssueCrossDemand: () => void;
  activities: DemandActivity[];
  documents: DemandDocument[];
  activitiesLoading: boolean;
  documentsLoading: boolean;
}

const DetailViewModal = ({
  demand,
  onClose,
  onAddActivity,
  onAddDocument,
  onDeleteDocument,
  onIssueCrossDemand,
  activities,
  documents,
  activitiesLoading,
  documentsLoading,
}: DetailViewModalProps) => {
  const [activeTab, setActiveTab] = useState<'details' | 'activities' | 'documents'>('details');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl my-8 rounded-xl bg-white shadow-2xl">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <div>
            <h2 className="text-base font-semibold">{demand.demand_number}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{demand.claimant_name} vs {demand.respondent_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium -mb-px transition ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 text-sm font-medium -mb-px transition ${
              activeTab === 'activities'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Activities
            {activities.length > 0 && (
              <span className="ml-1 text-xs bg-slate-100 px-1.5 py-0.5 rounded-full">{activities.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 text-sm font-medium -mb-px transition ${
              activeTab === 'documents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Documents
            {documents.length > 0 && (
              <span className="ml-1 text-xs bg-slate-100 px-1.5 py-0.5 rounded-full">{documents.length}</span>
            )}
          </button>
        </div>

        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium">Direction:</span> <span className={`px-2 py-0.5 rounded-full text-xs ${getDirectionBadgeClass(demand.direction)}`}>{getDirectionLabel(demand.direction)}</span></div>
                <div><span className="font-medium">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeClass(demand.status)}`}>{getStatusLabel(demand.status)}</span></div>
                <div><span className="font-medium">Date Received:</span> {new Date(demand.date_received).toLocaleDateString()}</div>
                <div><span className="font-medium">Response Deadline:</span> {demand.response_deadline ? new Date(demand.response_deadline).toLocaleDateString() : '—'}</div>
                <div><span className="font-medium">Amount Claimed:</span> {formatCurrency(demand.amount_claimed)}</div>
                <div><span className="font-medium">Amount Settled:</span> {formatCurrency(demand.amount_settled)}</div>
                <div className="col-span-2"><span className="font-medium">Nature of Dispute:</span> <p className="mt-1 text-slate-600">{demand.nature_of_dispute}</p></div>
                {demand.reference_number && <div className="col-span-2"><span className="font-medium">Reference:</span> {demand.reference_number}</div>}
                {demand.our_reference && <div className="col-span-2"><span className="font-medium">Our Reference:</span> {demand.our_reference}</div>}
                {demand.assigned_to && <div><span className="font-medium">Assigned To:</span> {demand.assigned_to}</div>}
                {demand.status_notes && <div className="col-span-2"><span className="font-medium">Status Notes:</span> <p className="mt-1 text-slate-600">{demand.status_notes}</p></div>}
                {demand.notes && <div className="col-span-2"><span className="font-medium">Notes:</span> <p className="mt-1 text-slate-600">{demand.notes}</p></div>}
              </div>

              {/* Cross-demand section */}
              {demand.cross_demand_issued && (
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <h3 className="font-medium text-purple-800 mb-2">Cross-Demand Issued</h3>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Amount:</span> {formatCurrency(demand.cross_demand_amount)}</div>
                    <div><span className="font-medium">Details:</span> {demand.cross_demand_details}</div>
                    {demand.cross_demand_response_status && (
                      <div><span className="font-medium">Response Status:</span> {demand.cross_demand_response_status}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={onAddActivity}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Activity
                </button>
                <button
                  onClick={onAddDocument}
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Add Document
                </button>
                {!demand.cross_demand_issued && (
                  <button
                    onClick={onIssueCrossDemand}
                    className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Issue Cross-Demand
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Activities Tab */}
          {activeTab === 'activities' && (
            <div className="space-y-3">
              {activitiesLoading ? (
                <div className="flex justify-center py-8"><Spinner size="md" /></div>
              ) : activities.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No activities recorded</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="border-l-4 border-blue-400 pl-4 py-2 bg-slate-50 rounded-r-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-medium text-blue-600 uppercase">{activity.activity_type}</span>
                        <p className="text-sm text-slate-700 mt-1">{activity.description}</p>
                        {activity.performed_by && (
                          <p className="text-xs text-slate-500 mt-1">By: {activity.performed_by}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{new Date(activity.activity_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-2">
              {documentsLoading ? (
                <div className="flex justify-center py-8"><Spinner size="md" /></div>
              ) : documents.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No documents uploaded</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{doc.document_name}</p>
                        {doc.document_type && <p className="text-xs text-slate-500">{doc.document_type}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View
                      </a>
                      <button
                        onClick={() => onDeleteDocument(doc.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN PAGE COMPONENT
============================================================ */

const AdminDemands = () => {
  const dispatch = useAppDispatch();

  const demands = useAppSelector(selectAllDemands);
  const pagination = useAppSelector(selectDemandsPagination);
  const filters = useAppSelector(selectDemandsFilters);
  const summary = useAppSelector(selectDemandsSummary);
  const listLoading = useAppSelector(selectDemandsListLoading);
  const mutating = useAppSelector(selectDemandsMutating);
  const error = useAppSelector(selectDemandsError);
  const selectedDemand = useAppSelector(selectSelectedDemand);
  const activities = useAppSelector(selectDemandActivities);
  const documents = useAppSelector(selectDemandDocuments);
  const activitiesLoading = useAppSelector(selectDemandsActivitiesLoading);
  const documentsLoading = useAppSelector(selectDemandsDocumentsLoading);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Demand | null>(null);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [viewingDemand, setViewingDemand] = useState<Demand | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [crossDemandModalOpen, setCrossDemandModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.claimant_name ?? '');
  const [minAmount, setMinAmount] = useState<string>(filters.min_amount?.toString() ?? '');
  const [maxAmount, setMaxAmount] = useState<string>(filters.max_amount?.toString() ?? '');

 const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

useEffect(() => {
  // Parse the filterKey back to filters object
  const parsedFilters = JSON.parse(filterKey);
  dispatch(fetchDemands(parsedFilters));
}, [dispatch, filterKey]);
  // Fetch activities and documents when viewing a demand
  useEffect(() => {
    if (viewingDemand) {
      dispatch(fetchDemandActivities(viewingDemand.id));
      dispatch(fetchDemandDocuments(viewingDemand.id));
    }
  }, [dispatch, viewingDemand]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.claimant_name) {
        dispatch(setFilters({ claimant_name: searchInput || undefined, page: 1 }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, dispatch, filters.claimant_name]);

  // Debounced amount filters
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setFilters({
        min_amount: minAmount ? Number(minAmount) : undefined,
        max_amount: maxAmount ? Number(maxAmount) : undefined,
        page: 1,
      }));
    }, 400);
    return () => clearTimeout(timer);
  }, [minAmount, maxAmount, dispatch]);

  const handleFilterChange = useCallback((key: keyof typeof filters, val: string) => {
    dispatch(setFilters({ [key]: val || undefined, page: 1 }));
  }, [dispatch]);

  const handlePageChange = useCallback((page: number) => {
    dispatch(setFilters({ page }));
  }, [dispatch]);

  const openAdd = useCallback(() => {
    setEditingDemand(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((demand: Demand) => {
    dispatch(fetchDemandById(demand.id));
    setEditingDemand(demand);
    setModalOpen(true);
  }, [dispatch]);

  const openView = useCallback((demand: Demand) => {
    setViewingDemand(demand);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingDemand(null);
    dispatch(clearSelectedDemand());
  }, [dispatch]);

  const handleSubmit = useCallback(async (data: CreateDemandDto) => {
    if (editingDemand) {
      await dispatch(updateDemand({ id: editingDemand.id, payload: data }));
    } else {
      await dispatch(createDemand(data));
    }
    closeModal();
  }, [dispatch, editingDemand, closeModal]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await dispatch(deleteDemand(deleteTarget.id));
    setDeleteTarget(null);
  }, [dispatch, deleteTarget]);

  const handleAddActivity = useCallback(async (activity: AddDemandActivityDto) => {
    if (!viewingDemand) return;
    await dispatch(addDemandActivity(activity));
    setActivityModalOpen(false);
    await dispatch(fetchDemandActivities(viewingDemand.id));
  }, [dispatch, viewingDemand]);

  const handleAddDocument = useCallback(async () => {
    // This would typically open a file upload modal
    // For demo purposes, we'll show a prompt
    const url = prompt('Enter document URL:');
    if (url && viewingDemand) {
      const name = prompt('Document name:');
      if (name) {
        await dispatch(addDemandDocument({
          demand_id: viewingDemand.id,
          document_name: name,
          file_url: url,
        }));
        await dispatch(fetchDemandDocuments(viewingDemand.id));
      }
    }
  }, [dispatch, viewingDemand]);

  const handleDeleteDocument = useCallback(async (documentId: number) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await dispatch(deleteDemandDocument(documentId));
      if (viewingDemand) {
        await dispatch(fetchDemandDocuments(viewingDemand.id));
      }
    }
  }, [dispatch, viewingDemand]);

  const handleIssueCrossDemand = useCallback(async (data: IssueCrossDemandDto) => {
    if (!viewingDemand) return;
    await dispatch(issueCrossDemand({ id: viewingDemand.id, payload: data }));
    setCrossDemandModalOpen(false);
    setViewingDemand(null);
  }, [dispatch, viewingDemand]);

  const handleReset = useCallback(() => {
    dispatch(resetFilters());
    setSearchInput('');
    setMinAmount('');
    setMaxAmount('');
  }, [dispatch]);

  // Table headers
  const headers = [
    'Demand No.',
    'Direction',
    'Claimant',
    'Respondent',
    'Amount Claimed',
    'Amount Settled',
    'Status',
    'Date Received',
    'Actions',
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Modals */}
      {modalOpen && (
        <DemandModal
          initial={editingDemand ? (selectedDemand ?? editingDemand) : null}
          onSubmit={handleSubmit}
          onClose={closeModal}
          loading={mutating}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          title="Delete demand"
          message={`This will permanently remove the demand from "${deleteTarget.claimant_name}". This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
      {activityModalOpen && viewingDemand && (
        <ActivityModal
          demandId={viewingDemand.id}
          onConfirm={handleAddActivity}
          onCancel={() => setActivityModalOpen(false)}
          loading={mutating}
        />
      )}
      {crossDemandModalOpen && viewingDemand && (
        <CrossDemandModal
          onConfirm={handleIssueCrossDemand}
          onCancel={() => setCrossDemandModalOpen(false)}
          loading={mutating}
        />
      )}
      {viewingDemand && !activityModalOpen && !crossDemandModalOpen && (
        <DetailViewModal
          demand={viewingDemand}
          onClose={() => setViewingDemand(null)}
          onAddActivity={() => setActivityModalOpen(true)}
          onAddDocument={handleAddDocument}
          onDeleteDocument={handleDeleteDocument}
          onIssueCrossDemand={() => setCrossDemandModalOpen(true)}
          activities={activities}
          documents={documents}
          activitiesLoading={activitiesLoading}
          documentsLoading={documentsLoading}
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Demands</h1>
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
            Add Demand
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Total Incoming</p>
              <p className="text-2xl font-bold text-red-600">{summary.total_incoming}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Total Outgoing</p>
              <p className="text-2xl font-bold text-emerald-600">{summary.total_outgoing}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Total Amount Claimed</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.total_amount_claimed)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Total Amount Settled</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.total_amount_settled)}</p>
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
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by claimant…"
                className="pl-9 pr-3 py-2 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filters.direction ?? ''}
              onChange={(e) => handleFilterChange('direction', e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white"
            >
              <option value="">All directions</option>
              {DEMAND_DIRECTIONS.map((d) => (
                <option key={d} value={d}>{getDirectionLabel(d)}</option>
              ))}
            </select>

            <select
              value={filters.status ?? ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 bg-white"
            >
              <option value="">All statuses</option>
              {DEMAND_STATUSES.map((s) => (
                <option key={s} value={s}>{getStatusLabel(s)}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Min amount"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 w-36"
            />
            <input
              type="number"
              placeholder="Max amount"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
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
            <table className="w-full text-sm min-w-[1000px]">
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
                ) : demands.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="py-20 text-center text-slate-400">
                      No demands found
                    </td>
                  </tr>
                ) : (
                  demands.map((demand) => (
                    <tr
                      key={demand.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer"
                      onClick={() => openView(demand)}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{demand.demand_number}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getDirectionBadgeClass(demand.direction)}`}>
                          {getDirectionLabel(demand.direction)}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-700 max-w-[200px] truncate" title={demand.claimant_name}>
                        {demand.claimant_name}
                      </td>
                      <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={demand.respondent_name}>
                        {demand.respondent_name}
                      </td>
                      <td className="px-3 py-2 text-right">{formatCurrency(demand.amount_claimed)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(demand.amount_settled)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeClass(demand.status)}`}>
                          {getStatusLabel(demand.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2">{new Date(demand.date_received).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(demand)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(demand)}
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

export default AdminDemands;