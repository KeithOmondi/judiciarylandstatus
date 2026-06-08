// legalDues.slice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES - Aligned with Backend Schema
============================================================ */
export type LegalDuesType = 'award' | 'external_counsel' | 'arbitrator_fee';
export type LegalDueStatus = 
  | 'pending'
  | 'partial'
  | 'paid'
  | 'disputed'
  | 'in_negotiation'
  | 'concluded_unpaid'
  | 'under_collection';

export interface Debtor {
  id: number;
  name: string;
  is_individual: boolean;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface LegalDuePayment {
  id: number;
  legal_due_id: number;
  amount_paid: number;
  payment_date: string;
  fiscal_year: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

export interface LegalDueCase {
  id: number;
  legal_due_id: number;
  court_file_ref: string | null;
  case_type: string | null;
  court_station: string | null;
  judgment_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface LegalDue {
  id: number;
  reference_number: string | null;
  type: LegalDuesType;
  debtors: Debtor[];
  dispute_description: string | null;
  date_incurred: string | null;
  date_due: string | null;
  total_amount: number;
  interest_rate: number | null;
  interest_accrued: number;
  paid_amount: number;
  outstanding_amount: number;
  status: LegalDueStatus;
  notes: string | null;
  payments: LegalDuePayment[];
  cases: LegalDueCase[];
  created_at: string;
  updated_at: string;
}

// DTOs for API calls
export interface CreateDebtorDto {
  name: string;
  is_individual?: boolean;
  contact_person?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface CreatePaymentDto {
  amount_paid: number;
  payment_date: string;
  fiscal_year?: string;
  payment_reference?: string;
  payment_method?: string;
  notes?: string;
}

export interface CreateLegalDueCaseDto {
  court_file_ref?: string;
  case_type?: string;
  court_station?: string;
  judgment_date?: string;
  notes?: string;
}

export interface CreateLegalDuePayload {
  reference_number?: string;
  type: LegalDuesType;
  debtor_ids?: number[];
  new_debtors?: CreateDebtorDto[];
  dispute_description?: string;
  date_incurred?: string;
  date_due?: string;
  total_amount: number;
  interest_rate?: number;
  interest_accrued?: number;
  status?: LegalDueStatus;
  notes?: string;
  initial_payment?: CreatePaymentDto;
  case_reference?: CreateLegalDueCaseDto;
}

export interface AddPaymentPayload {
  legal_due_id: number;
  payment: CreatePaymentDto;
}

export interface UpdateLegalDuePayload {
  reference_number?: string;
  type?: LegalDuesType;
  dispute_description?: string;
  date_incurred?: string;
  date_due?: string;
  total_amount?: number;
  interest_rate?: number;
  interest_accrued?: number;
  status?: LegalDueStatus;
  notes?: string;
  add_debtor_ids?: number[];
  remove_debtor_ids?: number[];
}

export interface UpdateInterestPayload {
  id: number;
  additionalInterest: number;
}

export interface LegalDuesFilters {
  type?: LegalDuesType;
  status?: LegalDueStatus;
  debtor_name?: string;
  min_outstanding?: number;
  max_outstanding?: number;
  min_total?: number;
  max_total?: number;
  date_incurred_from?: string;
  date_incurred_to?: string;
  fiscal_year?: string;
  page?: number;
  limit?: number;
  sort_by?: 'total_amount' | 'outstanding_amount' | 'date_incurred' | 'interest_accrued';
  sort_order?: 'ASC' | 'DESC';
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SummaryStats {
  total_outstanding_all: number;
  total_paid_all: number;
  total_interest_accrued_all: number;
}

interface LegalDuesResponse {
  data: LegalDue[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: SummaryStats;
}

interface FiscalYearSummary {
  fiscal_year: string;
  total_payments: number;
  payment_count: number;
  legal_dues_affected: number;
}

interface LegalDuesState {
  dues: LegalDue[];
  selectedDue: LegalDue | null;
  pagination: PaginationMeta;
  summary: SummaryStats | null;
  filters: LegalDuesFilters;
  debtors: Debtor[];
  fiscalYearSummary: FiscalYearSummary | null;
  loading: {
    list: boolean;
    detail: boolean;
    mutating: boolean;
    debtors: boolean;
    fiscalYear: boolean;
  };
  error: string | null;
}

/* ============================================================
   INITIAL STATE
============================================================ */
const initialState: LegalDuesState = {
  dues: [],
  selectedDue: null,
  pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
  summary: null,
  filters: { page: 1, limit: 20 },
  debtors: [],
  fiscalYearSummary: null,
  loading: {
    list: false,
    detail: false,
    mutating: false,
    debtors: false,
    fiscalYear: false,
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

const buildQueryString = (filters: LegalDuesFilters): string => {
  const params = new URLSearchParams();
  (Object.keys(filters) as (keyof LegalDuesFilters)[]).forEach((key) => {
    const val = filters[key];
    if (val !== undefined && val !== null && val !== '') {
      params.append(key, String(val));
    }
  });
  return params.toString();
};

/* ============================================================
   ASYNC THUNKS
============================================================ */
export const fetchLegalDues = createAsyncThunk(
  'legalDues/fetchAll',
  async (filters: LegalDuesFilters, { rejectWithValue }) => {
    try {
      const qs = buildQueryString(filters);
      const response = await axiosClient.get(`/legal-dues?${qs}`);
      return response.data.data as LegalDuesResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchLegalDueById = createAsyncThunk(
  'legalDues/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/legal-dues/${id}`);
      return response.data.data as LegalDue;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const createLegalDue = createAsyncThunk(
  'legalDues/create',
  async (payload: CreateLegalDuePayload, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/legal-dues', payload);
      return response.data.data as LegalDue;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateLegalDue = createAsyncThunk(
  'legalDues/update',
  async ({ id, payload }: { id: number; payload: UpdateLegalDuePayload }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/legal-dues/${id}`, payload);
      return response.data.data as LegalDue;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteLegalDue = createAsyncThunk(
  'legalDues/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/legal-dues/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const addPayment = createAsyncThunk(
  'legalDues/addPayment',
  async (payload: AddPaymentPayload, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/legal-dues/payments', payload);
      return response.data.data as LegalDue;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateInterest = createAsyncThunk(
  'legalDues/updateInterest',
  async (payload: UpdateInterestPayload, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/legal-dues/${payload.id}/interest`, {
        additionalInterest: payload.additionalInterest,
      });
      return response.data.data as LegalDue;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchDebtors = createAsyncThunk(
  'legalDues/fetchDebtors',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/legal-dues/debtors');
      return response.data.data as Debtor[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const createDebtor = createAsyncThunk(
  'legalDues/createDebtor',
  async (payload: CreateDebtorDto, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/legal-dues/debtors', payload);
      return response.data.data as Debtor;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchFiscalYearSummary = createAsyncThunk(
  'legalDues/fetchFiscalYearSummary',
  async (fiscalYear: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/legal-dues/fiscal-year/${fiscalYear}`);
      return response.data.data as FiscalYearSummary;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */
const legalDuesSlice = createSlice({
  name: 'legalDues',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<LegalDuesFilters>>) {
      state.filters = { ...state.filters, ...action.payload, page: 1 };
    },
    resetFilters(state) {
      state.filters = { page: 1, limit: 20 };
    },
    clearSelectedDue(state) {
      state.selectedDue = null;
    },
    clearError(state) {
      state.error = null;
    },
    clearFiscalYearSummary(state) {
      state.fiscalYearSummary = null;
    },
  },
  extraReducers: (builder) => {
    /* ---------- FETCH ALL ---------- */
    builder
      .addCase(fetchLegalDues.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchLegalDues.fulfilled, (state, action) => {
        state.loading.list = false;
        state.dues = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
        state.summary = action.payload.summary;
      })
      .addCase(fetchLegalDues.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH BY ID ---------- */
    builder
      .addCase(fetchLegalDueById.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchLegalDueById.fulfilled, (state, action) => {
        state.loading.detail = false;
        state.selectedDue = action.payload;
      })
      .addCase(fetchLegalDueById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    /* ---------- CREATE ---------- */
    builder
      .addCase(createLegalDue.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(createLegalDue.fulfilled, (state, action) => {
        state.loading.mutating = false;
        state.dues.unshift(action.payload);
        state.pagination.total += 1;
        if (state.summary) {
          state.summary.total_outstanding_all += action.payload.outstanding_amount;
        }
      })
      .addCase(createLegalDue.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- UPDATE ---------- */
    builder
      .addCase(updateLegalDue.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(updateLegalDue.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const idx = state.dues.findIndex((d) => d.id === action.payload.id);
        if (idx !== -1) state.dues[idx] = action.payload;
        if (state.selectedDue?.id === action.payload.id) state.selectedDue = action.payload;
      })
      .addCase(updateLegalDue.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- DELETE ---------- */
    builder
      .addCase(deleteLegalDue.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(deleteLegalDue.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const deletedDue = state.dues.find((d) => d.id === action.payload);
        state.dues = state.dues.filter((d) => d.id !== action.payload);
        if (state.selectedDue?.id === action.payload) state.selectedDue = null;
        state.pagination.total -= 1;
        if (state.summary && deletedDue) {
          state.summary.total_outstanding_all -= deletedDue.outstanding_amount;
          state.summary.total_paid_all -= deletedDue.paid_amount;
          state.summary.total_interest_accrued_all -= deletedDue.interest_accrued;
        }
      })
      .addCase(deleteLegalDue.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- ADD PAYMENT ---------- */
    builder
      .addCase(addPayment.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(addPayment.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const idx = state.dues.findIndex((d) => d.id === action.payload.id);
        if (idx !== -1) state.dues[idx] = action.payload;
        if (state.selectedDue?.id === action.payload.id) state.selectedDue = action.payload;
        if (state.summary) {
          // Recalculate summary or update incrementally
          const oldDue = state.dues.find((d) => d.id === action.payload.id);
          if (oldDue) {
            const paymentDiff = action.payload.paid_amount - oldDue.paid_amount;
            state.summary.total_paid_all += paymentDiff;
            state.summary.total_outstanding_all -= paymentDiff;
          }
        }
      })
      .addCase(addPayment.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- UPDATE INTEREST ---------- */
    builder
      .addCase(updateInterest.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(updateInterest.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const idx = state.dues.findIndex((d) => d.id === action.payload.id);
        if (idx !== -1) state.dues[idx] = action.payload;
        if (state.selectedDue?.id === action.payload.id) state.selectedDue = action.payload;
        if (state.summary) {
          const oldDue = state.dues.find((d) => d.id === action.payload.id);
          if (oldDue) {
            const interestDiff = action.payload.interest_accrued - oldDue.interest_accrued;
            state.summary.total_interest_accrued_all += interestDiff;
            state.summary.total_outstanding_all += interestDiff;
          }
        }
      })
      .addCase(updateInterest.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH DEBTORS ---------- */
    builder
      .addCase(fetchDebtors.pending, (state) => {
        state.loading.debtors = true;
        state.error = null;
      })
      .addCase(fetchDebtors.fulfilled, (state, action) => {
        state.loading.debtors = false;
        state.debtors = action.payload;
      })
      .addCase(fetchDebtors.rejected, (state, action) => {
        state.loading.debtors = false;
        state.error = action.payload as string;
      });

    /* ---------- CREATE DEBTOR ---------- */
    builder
      .addCase(createDebtor.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(createDebtor.fulfilled, (state, action) => {
        state.loading.mutating = false;
        state.debtors.unshift(action.payload);
      })
      .addCase(createDebtor.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH FISCAL YEAR SUMMARY ---------- */
    builder
      .addCase(fetchFiscalYearSummary.pending, (state) => {
        state.loading.fiscalYear = true;
        state.error = null;
      })
      .addCase(fetchFiscalYearSummary.fulfilled, (state, action) => {
        state.loading.fiscalYear = false;
        state.fiscalYearSummary = action.payload;
      })
      .addCase(fetchFiscalYearSummary.rejected, (state, action) => {
        state.loading.fiscalYear = false;
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
  clearSelectedDue, 
  clearError,
  clearFiscalYearSummary,
} = legalDuesSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */
export const selectAllLegalDues = (state: { legalDues: LegalDuesState }) => state.legalDues.dues;
export const selectSelectedDue = (state: { legalDues: LegalDuesState }) => state.legalDues.selectedDue;
export const selectLegalDuesPagination = (state: { legalDues: LegalDuesState }) => state.legalDues.pagination;
export const selectLegalDuesSummary = (state: { legalDues: LegalDuesState }) => state.legalDues.summary;
export const selectLegalDuesFilters = (state: { legalDues: LegalDuesState }) => state.legalDues.filters;
export const selectAllDebtors = (state: { legalDues: LegalDuesState }) => state.legalDues.debtors;
export const selectFiscalYearSummary = (state: { legalDues: LegalDuesState }) => state.legalDues.fiscalYearSummary;

export const selectLegalDuesListLoading = (state: { legalDues: LegalDuesState }) => state.legalDues.loading.list;
export const selectLegalDuesDetailLoading = (state: { legalDues: LegalDuesState }) => state.legalDues.loading.detail;
export const selectLegalDuesMutating = (state: { legalDues: LegalDuesState }) => state.legalDues.loading.mutating;
export const selectDebtorsLoading = (state: { legalDues: LegalDuesState }) => state.legalDues.loading.debtors;
export const selectFiscalYearLoading = (state: { legalDues: LegalDuesState }) => state.legalDues.loading.fiscalYear;
export const selectLegalDuesError = (state: { legalDues: LegalDuesState }) => state.legalDues.error;

// Computed selectors
export const selectTotalOutstanding = (state: { legalDues: LegalDuesState }) => 
  state.legalDues.summary?.total_outstanding_all ?? 0;

export const selectTotalPaid = (state: { legalDues: LegalDuesState }) => 
  state.legalDues.summary?.total_paid_all ?? 0;

export const selectTotalInterestAccrued = (state: { legalDues: LegalDuesState }) => 
  state.legalDues.summary?.total_interest_accrued_all ?? 0;

export default legalDuesSlice.reducer;