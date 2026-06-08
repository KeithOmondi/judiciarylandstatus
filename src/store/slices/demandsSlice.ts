// store/slices/demandsSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES - Aligned with Backend Schema
============================================================ */

export type DemandStatus = 
  | 'pending'
  | 'in_negotiation'
  | 'disputed'
  | 'counter_demand'
  | 'settled'
  | 'escalated'
  | 'rejected'
  | 'drafting_response'
  | 'awaiting_legal_advice';

export type DemandDirection = 'incoming' | 'outgoing';

export interface DemandActivity {
  id: number;
  demand_id: number;
  activity_type: string;
  activity_date: string;
  description: string;
  performed_by: string | null;
  attachments: string[] | null;
  created_at: string;
}

export interface DemandDocument {
  id: number;
  demand_id: number;
  document_name: string;
  document_type: string | null;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface Demand {
  id: number;
  demand_number: string;
  direction: DemandDirection;
  claimant_name: string;
  respondent_name: string;
  nature_of_dispute: string;
  amount_claimed: number | null;
  amount_settled: number;
  currency: string;
  status: DemandStatus;
  status_notes: string | null;
  date_received: string;
  date_responded: string | null;
  response_deadline: string | null;
  reference_number: string | null;
  our_reference: string | null;
  last_communication_date: string | null;
  last_communication_notes: string | null;
  assigned_to: string | null;
  legal_officer_id: number | null;
  demand_letter_url: string | null;
  response_letter_url: string | null;
  supporting_docs: string[] | null;
  cross_demand_issued: boolean;
  cross_demand_amount: number | null;
  cross_demand_details: string | null;
  cross_demand_response_status: string | null;
  notes: string | null;
  activities: DemandActivity[];
  documents: DemandDocument[];
  created_at: string;
  updated_at: string;
}

// DTOs for API calls
export interface CreateDemandDto {
  direction?: DemandDirection;
  claimant_name: string;
  respondent_name: string;
  nature_of_dispute: string;
  amount_claimed?: number;
  amount_settled?: number;
  currency?: string;
  status?: DemandStatus;
  status_notes?: string;
  date_received?: string;
  response_deadline?: string;
  reference_number?: string;
  our_reference?: string;
  assigned_to?: string;
  legal_officer_id?: number;
  demand_letter_url?: string;
  notes?: string;
  cross_demand_issued?: boolean;
  cross_demand_amount?: number;
  cross_demand_details?: string;
}

export interface UpdateDemandDto extends Partial<CreateDemandDto> {
  date_responded?: string;
  last_communication_date?: string;
  last_communication_notes?: string;
  response_letter_url?: string;
  cross_demand_response_status?: string;
}

export interface AddDemandActivityDto {
  demand_id: number;
  activity_type: string;
  activity_date?: string;
  description: string;
  performed_by?: string;
  attachments?: string[];
}

export interface AddDemandDocumentDto {
  demand_id: number;
  document_name: string;
  document_type?: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
}

export interface IssueCrossDemandDto {
  cross_demand_amount: number;
  cross_demand_details: string;
}

export interface DemandFilters {
  direction?: DemandDirection;
  status?: DemandStatus;
  claimant_name?: string;
  respondent_name?: string;
  min_amount?: number;
  max_amount?: number;
  date_from?: string;
  date_to?: string;
  assigned_to?: string;
  cross_demand_issued?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'date_received' | 'amount_claimed' | 'status' | 'claimant_name';
  sort_order?: 'ASC' | 'DESC';
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SummaryStats {
  total_incoming: number;
  total_outgoing: number;
  total_amount_claimed: number;
  total_amount_settled: number;
  pending_count: number;
  in_negotiation_count: number;
  escalated_count: number;
}

interface DemandsResponse {
  data: Demand[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: SummaryStats;
}

interface DemandsState {
  demands: Demand[];
  selectedDemand: Demand | null;
  pagination: PaginationMeta;
  summary: SummaryStats | null;
  filters: DemandFilters;
  activities: DemandActivity[];
  documents: DemandDocument[];
  loading: {
    list: boolean;
    detail: boolean;
    mutating: boolean;
    activities: boolean;
    documents: boolean;
  };
  error: string | null;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: DemandsState = {
  demands: [],
  selectedDemand: null,
  pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
  summary: null,
  filters: { page: 1, limit: 20 },
  activities: [],
  documents: [],
  loading: {
    list: false,
    detail: false,
    mutating: false,
    activities: false,
    documents: false,
  },
  error: null,
};

/* ============================================================
   HELPERS
============================================================ */

const extractErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

const buildQueryString = (filters: DemandFilters): string => {
  const params = new URLSearchParams();
  (Object.keys(filters) as (keyof DemandFilters)[]).forEach((key) => {
    const val = filters[key];
    if (val !== undefined && val !== null && val !== '') {
      params.append(key, String(val));
    }
  });
  return params.toString();
};

// Helper to get status badge color
export const getStatusBadgeClass = (status: DemandStatus): string => {
  const classes: Record<DemandStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    in_negotiation: 'bg-blue-100 text-blue-700',
    disputed: 'bg-red-100 text-red-700',
    counter_demand: 'bg-purple-100 text-purple-700',
    settled: 'bg-emerald-100 text-emerald-700',
    escalated: 'bg-rose-100 text-rose-700',
    rejected: 'bg-gray-100 text-gray-700',
    drafting_response: 'bg-indigo-100 text-indigo-700',
    awaiting_legal_advice: 'bg-orange-100 text-orange-700',
  };
  return classes[status] || 'bg-slate-100 text-slate-700';
};

// Helper to get status label
export const getStatusLabel = (status: DemandStatus): string => {
  const labels: Record<DemandStatus, string> = {
    pending: 'Pending',
    in_negotiation: 'In Negotiation',
    disputed: 'Disputed',
    counter_demand: 'Counter-Demand Issued',
    settled: 'Settled',
    escalated: 'Escalated to Legal',
    rejected: 'Rejected',
    drafting_response: 'Drafting Response',
    awaiting_legal_advice: 'Awaiting Legal Advice',
  };
  return labels[status] || status;
};

// Helper to get direction badge
export const getDirectionBadgeClass = (direction: DemandDirection): string => {
  return direction === 'incoming' 
    ? 'bg-red-100 text-red-700' 
    : 'bg-emerald-100 text-emerald-700';
};

export const getDirectionLabel = (direction: DemandDirection): string => {
  return direction === 'incoming' ? 'Incoming' : 'Outgoing';
};

// Helper to format currency
export const formatCurrency = (amount: number | null): string => {
  if (amount === null) return '—';
  return `KSh ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/* ============================================================
   ASYNC THUNKS
============================================================ */

// Fetch all demands with filters
export const fetchDemands = createAsyncThunk(
  'demands/fetchAll',
  async (filters: DemandFilters, { rejectWithValue }) => {
    try {
      const qs = buildQueryString(filters);
      const response = await axiosClient.get(`/demands?${qs}`);
      return response.data.data as DemandsResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Fetch demand by ID
export const fetchDemandById = createAsyncThunk(
  'demands/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/demands/${id}`);
      return response.data.data as Demand;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Fetch demand by demand number (DEM-YYYY-XXXXX)
export const fetchDemandByNumber = createAsyncThunk(
  'demands/fetchByNumber',
  async (demandNumber: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/demands/by-number/${demandNumber}`);
      return response.data.data as Demand;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Create new demand
export const createDemand = createAsyncThunk(
  'demands/create',
  async (payload: CreateDemandDto, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/demands', payload);
      return response.data.data as Demand;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Update demand
export const updateDemand = createAsyncThunk(
  'demands/update',
  async ({ id, payload }: { id: number; payload: UpdateDemandDto }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/demands/${id}`, payload);
      return response.data.data as Demand;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Delete demand
export const deleteDemand = createAsyncThunk(
  'demands/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/demands/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Add activity to demand
export const addDemandActivity = createAsyncThunk(
  'demands/addActivity',
  async (payload: AddDemandActivityDto, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/demands/activities', payload);
      return response.data.data as DemandActivity;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Fetch activities for a demand
export const fetchDemandActivities = createAsyncThunk(
  'demands/fetchActivities',
  async (demandId: number, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/demands/${demandId}/activities`);
      return response.data.data as DemandActivity[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Add document to demand
export const addDemandDocument = createAsyncThunk(
  'demands/addDocument',
  async (payload: AddDemandDocumentDto, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/demands/documents', payload);
      return response.data.data as DemandDocument;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Fetch documents for a demand
export const fetchDemandDocuments = createAsyncThunk(
  'demands/fetchDocuments',
  async (demandId: number, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/demands/${demandId}/documents`);
      return response.data.data as DemandDocument[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Delete document
export const deleteDemandDocument = createAsyncThunk(
  'demands/deleteDocument',
  async (documentId: number, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/demands/documents/${documentId}`);
      return documentId;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Issue cross-demand
export const issueCrossDemand = createAsyncThunk(
  'demands/issueCrossDemand',
  async ({ id, payload }: { id: number; payload: IssueCrossDemandDto }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/demands/${id}/cross-demand`, payload);
      return response.data.data as Demand;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const demandsSlice = createSlice({
  name: 'demands',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<DemandFilters>>) {
      state.filters = { ...state.filters, ...action.payload, page: 1 };
    },
    resetFilters(state) {
      state.filters = { page: 1, limit: 20 };
    },
    clearSelectedDemand(state) {
      state.selectedDemand = null;
    },
    clearError(state) {
      state.error = null;
    },
    clearActivities(state) {
      state.activities = [];
    },
    clearDocuments(state) {
      state.documents = [];
    },
  },
  extraReducers: (builder) => {
    /* ---------- FETCH ALL DEMANDS ---------- */
    builder
      .addCase(fetchDemands.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchDemands.fulfilled, (state, action) => {
        state.loading.list = false;
        state.demands = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
        state.summary = action.payload.summary;
      })
      .addCase(fetchDemands.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH DEMAND BY ID ---------- */
    builder
      .addCase(fetchDemandById.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchDemandById.fulfilled, (state, action) => {
        state.loading.detail = false;
        state.selectedDemand = action.payload;
      })
      .addCase(fetchDemandById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH DEMAND BY NUMBER ---------- */
    builder
      .addCase(fetchDemandByNumber.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchDemandByNumber.fulfilled, (state, action) => {
        state.loading.detail = false;
        state.selectedDemand = action.payload;
      })
      .addCase(fetchDemandByNumber.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    /* ---------- CREATE DEMAND ---------- */
    builder
      .addCase(createDemand.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(createDemand.fulfilled, (state, action) => {
        state.loading.mutating = false;
        state.demands.unshift(action.payload);
        state.pagination.total += 1;
        if (state.summary) {
          if (action.payload.direction === 'incoming') {
            state.summary.total_incoming += 1;
          } else {
            state.summary.total_outgoing += 1;
          }
          if (action.payload.amount_claimed) {
            state.summary.total_amount_claimed += action.payload.amount_claimed;
          }
          if (action.payload.status === 'pending') {
            state.summary.pending_count += 1;
          }
        }
      })
      .addCase(createDemand.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- UPDATE DEMAND ---------- */
    builder
      .addCase(updateDemand.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(updateDemand.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const idx = state.demands.findIndex((d) => d.id === action.payload.id);
        if (idx !== -1) state.demands[idx] = action.payload;
        if (state.selectedDemand?.id === action.payload.id) state.selectedDemand = action.payload;
      })
      .addCase(updateDemand.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- DELETE DEMAND ---------- */
    builder
      .addCase(deleteDemand.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(deleteDemand.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const deletedDemand = state.demands.find((d) => d.id === action.payload);
        state.demands = state.demands.filter((d) => d.id !== action.payload);
        if (state.selectedDemand?.id === action.payload) state.selectedDemand = null;
        state.pagination.total -= 1;
        if (state.summary && deletedDemand) {
          if (deletedDemand.direction === 'incoming') {
            state.summary.total_incoming -= 1;
          } else {
            state.summary.total_outgoing -= 1;
          }
          if (deletedDemand.amount_claimed) {
            state.summary.total_amount_claimed -= deletedDemand.amount_claimed;
          }
          if (deletedDemand.status === 'pending') {
            state.summary.pending_count -= 1;
          }
        }
      })
      .addCase(deleteDemand.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- ADD ACTIVITY ---------- */
    builder
      .addCase(addDemandActivity.pending, (state) => {
        state.loading.activities = true;
        state.error = null;
      })
      .addCase(addDemandActivity.fulfilled, (state, action) => {
        state.loading.activities = false;
        state.activities.unshift(action.payload);
      })
      .addCase(addDemandActivity.rejected, (state, action) => {
        state.loading.activities = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH ACTIVITIES ---------- */
    builder
      .addCase(fetchDemandActivities.pending, (state) => {
        state.loading.activities = true;
        state.error = null;
      })
      .addCase(fetchDemandActivities.fulfilled, (state, action) => {
        state.loading.activities = false;
        state.activities = action.payload;
      })
      .addCase(fetchDemandActivities.rejected, (state, action) => {
        state.loading.activities = false;
        state.error = action.payload as string;
      });

    /* ---------- ADD DOCUMENT ---------- */
    builder
      .addCase(addDemandDocument.pending, (state) => {
        state.loading.documents = true;
        state.error = null;
      })
      .addCase(addDemandDocument.fulfilled, (state, action) => {
        state.loading.documents = false;
        state.documents.unshift(action.payload);
      })
      .addCase(addDemandDocument.rejected, (state, action) => {
        state.loading.documents = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH DOCUMENTS ---------- */
    builder
      .addCase(fetchDemandDocuments.pending, (state) => {
        state.loading.documents = true;
        state.error = null;
      })
      .addCase(fetchDemandDocuments.fulfilled, (state, action) => {
        state.loading.documents = false;
        state.documents = action.payload;
      })
      .addCase(fetchDemandDocuments.rejected, (state, action) => {
        state.loading.documents = false;
        state.error = action.payload as string;
      });

    /* ---------- DELETE DOCUMENT ---------- */
    builder
      .addCase(deleteDemandDocument.pending, (state) => {
        state.loading.documents = true;
        state.error = null;
      })
      .addCase(deleteDemandDocument.fulfilled, (state, action) => {
        state.loading.documents = false;
        state.documents = state.documents.filter((d) => d.id !== action.payload);
      })
      .addCase(deleteDemandDocument.rejected, (state, action) => {
        state.loading.documents = false;
        state.error = action.payload as string;
      });

    /* ---------- ISSUE CROSS DEMAND ---------- */
    builder
      .addCase(issueCrossDemand.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(issueCrossDemand.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const idx = state.demands.findIndex((d) => d.id === action.payload.id);
        if (idx !== -1) state.demands[idx] = action.payload;
        if (state.selectedDemand?.id === action.payload.id) state.selectedDemand = action.payload;
      })
      .addCase(issueCrossDemand.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  setFilters,
  resetFilters,
  clearSelectedDemand,
  clearError,
  clearActivities,
  clearDocuments,
} = demandsSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectAllDemands = (state: { demands: DemandsState }) => state.demands.demands;
export const selectSelectedDemand = (state: { demands: DemandsState }) => state.demands.selectedDemand;
export const selectDemandsPagination = (state: { demands: DemandsState }) => state.demands.pagination;
export const selectDemandsSummary = (state: { demands: DemandsState }) => state.demands.summary;
export const selectDemandsFilters = (state: { demands: DemandsState }) => state.demands.filters;
export const selectDemandActivities = (state: { demands: DemandsState }) => state.demands.activities;
export const selectDemandDocuments = (state: { demands: DemandsState }) => state.demands.documents;

export const selectDemandsListLoading = (state: { demands: DemandsState }) => state.demands.loading.list;
export const selectDemandsDetailLoading = (state: { demands: DemandsState }) => state.demands.loading.detail;
export const selectDemandsMutating = (state: { demands: DemandsState }) => state.demands.loading.mutating;
export const selectDemandsActivitiesLoading = (state: { demands: DemandsState }) => state.demands.loading.activities;
export const selectDemandsDocumentsLoading = (state: { demands: DemandsState }) => state.demands.loading.documents;
export const selectDemandsError = (state: { demands: DemandsState }) => state.demands.error;

// Computed selectors
export const selectTotalIncoming = (state: { demands: DemandsState }) => 
  state.demands.summary?.total_incoming ?? 0;

export const selectTotalOutgoing = (state: { demands: DemandsState }) => 
  state.demands.summary?.total_outgoing ?? 0;

export const selectTotalAmountClaimed = (state: { demands: DemandsState }) => 
  state.demands.summary?.total_amount_claimed ?? 0;

export const selectTotalAmountSettled = (state: { demands: DemandsState }) => 
  state.demands.summary?.total_amount_settled ?? 0;

export const selectPendingCount = (state: { demands: DemandsState }) => 
  state.demands.summary?.pending_count ?? 0;

export const selectInNegotiationCount = (state: { demands: DemandsState }) => 
  state.demands.summary?.in_negotiation_count ?? 0;

export const selectEscalatedCount = (state: { demands: DemandsState }) => 
  state.demands.summary?.escalated_count ?? 0;

export default demandsSlice.reducer;