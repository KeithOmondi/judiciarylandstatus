import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES
============================================================ */
export type CaseStatus = 'Ongoing' | 'Concluded';
export type CaseType = 'Court' | 'Arbitration' | 'PPRB';
export type CaseCategory =
  | 'Judicial Decisions'
  | 'Procurement'
  | 'Constitutional'
  | 'Construction'
  | 'Accident'
  | 'Employment'
  | 'Land'
  | 'Miscellaneous';
export type RepresentationType = 'State Law' | 'In House' | 'External' | 'EACC';

export interface CourtCase {
  id: number;
  date_of_filing: string | null;
  ocrj_file_ref: string;
  year: number;
  type_of_case: CaseType;
  court_station: string | null;
  court_file_ref: string | null;
  plaintiff: string | null;
  defendant: string | null;
  claim: string | null;
  category: CaseCategory | null;
  judiciary_representation: RepresentationType | null;
  counsel_name: string | null;
  opposing_counsel: string | null;
  latest_update: string | null;
  status: CaseStatus | null;
  outcome: string | null;
  legal_fees: number | null;
  created_at: string;
  updated_at: string;
}

export interface CourtCaseFilters {
  status?: CaseStatus;
  type_of_case?: CaseType;
  category?: CaseCategory;
  judiciary_representation?: RepresentationType;
  year?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateCourtCasePayload {
  date_of_filing?: string;
  ocrj_file_ref: string;
  year: number;
  type_of_case: CaseType;
  court_station?: string;
  court_file_ref?: string;
  plaintiff?: string;
  defendant?: string;
  claim?: string;
  category?: CaseCategory;
  judiciary_representation?: RepresentationType;
  counsel_name?: string;
  opposing_counsel?: string;
  latest_update?: string;
  status?: CaseStatus;
  outcome?: string;
  legal_fees?: number;
}

export type UpdateCourtCasePayload = Partial<CreateCourtCasePayload>;

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CourtCaseState {
  cases: CourtCase[];
  selectedCase: CourtCase | null;
  pagination: PaginationMeta;
  filters: CourtCaseFilters;
  loading: {
    list: boolean;
    detail: boolean;
    mutating: boolean;   // covers create / update / delete
  };
  error: string | null;
}

/* ============================================================
   INITIAL STATE
============================================================ */
const initialState: CourtCaseState = {
  cases: [],
  selectedCase: null,
  pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
  filters: { page: 1, limit: 20 },
  loading: { list: false, detail: false, mutating: false },
  error: null,
};

/* ============================================================
   HELPERS
============================================================ */
const extractErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

const buildQueryString = (filters: CourtCaseFilters): string => {
  const params = new URLSearchParams();
  (Object.keys(filters) as (keyof CourtCaseFilters)[]).forEach((key) => {
    const val = filters[key];
    if (val !== undefined && val !== '') params.append(key, String(val));
  });
  return params.toString();
};

/* ============================================================
   ASYNC THUNKS
============================================================ */
export const fetchCourtCases = createAsyncThunk(
  'courtCases/fetchAll',
  async (filters: CourtCaseFilters, { rejectWithValue }) => {
    try {
      const qs = buildQueryString(filters);
      const response = await axiosClient.get(`/court-cases?${qs}`);
      return response.data.data as { data: CourtCase[]; total: number; page: number; limit: number; totalPages: number };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchCourtCaseById = createAsyncThunk(
  'courtCases/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/court-cases/${id}`);
      return response.data.data as CourtCase;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const createCourtCase = createAsyncThunk(
  'courtCases/create',
  async (payload: CreateCourtCasePayload, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/court-cases', payload);
      return response.data.data as CourtCase;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateCourtCase = createAsyncThunk(
  'courtCases/update',
  async ({ id, payload }: { id: number; payload: UpdateCourtCasePayload }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/court-cases/${id}`, payload);
      return response.data.data as CourtCase;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteCourtCase = createAsyncThunk(
  'courtCases/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/court-cases/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */
const courtCaseSlice = createSlice({
  name: 'courtCases',
  initialState,
  reducers: {
    // Lets UI components update filters without immediately fetching
    setFilters(state, action: PayloadAction<Partial<CourtCaseFilters>>) {
      state.filters = { ...state.filters, ...action.payload, page: 1 };
    },
    resetFilters(state) {
      state.filters = { page: 1, limit: 20 };
    },
    clearSelectedCase(state) {
      state.selectedCase = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    /* ---------- FETCH ALL ---------- */
    builder
      .addCase(fetchCourtCases.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchCourtCases.fulfilled, (state, action) => {
        state.loading.list = false;
        state.cases = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchCourtCases.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH BY ID ---------- */
    builder
      .addCase(fetchCourtCaseById.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchCourtCaseById.fulfilled, (state, action) => {
        state.loading.detail = false;
        state.selectedCase = action.payload;
      })
      .addCase(fetchCourtCaseById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    /* ---------- CREATE ---------- */
    builder
      .addCase(createCourtCase.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(createCourtCase.fulfilled, (state, action) => {
        state.loading.mutating = false;
        state.cases.unshift(action.payload);   // prepend so it appears first
        state.pagination.total += 1;
      })
      .addCase(createCourtCase.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- UPDATE ---------- */
    builder
      .addCase(updateCourtCase.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(updateCourtCase.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const idx = state.cases.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.cases[idx] = action.payload;
        if (state.selectedCase?.id === action.payload.id) state.selectedCase = action.payload;
      })
      .addCase(updateCourtCase.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- DELETE ---------- */
    builder
      .addCase(deleteCourtCase.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(deleteCourtCase.fulfilled, (state, action) => {
        state.loading.mutating = false;
        state.cases = state.cases.filter((c) => c.id !== action.payload);
        if (state.selectedCase?.id === action.payload) state.selectedCase = null;
        state.pagination.total -= 1;
      })
      .addCase(deleteCourtCase.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });
  },
});

/* ============================================================
   ACTIONS & SELECTORS
============================================================ */
export const { setFilters, resetFilters, clearSelectedCase, clearError } = courtCaseSlice.actions;

// Selectors
export const selectAllCourtCases = (state: { courtCases: CourtCaseState }) => state.courtCases.cases;
export const selectSelectedCase = (state: { courtCases: CourtCaseState }) => state.courtCases.selectedCase;
export const selectCourtCasePagination = (state: { courtCases: CourtCaseState }) => state.courtCases.pagination;
export const selectCourtCaseFilters = (state: { courtCases: CourtCaseState }) => state.courtCases.filters;
export const selectCourtCaseListLoading = (state: { courtCases: CourtCaseState }) => state.courtCases.loading.list;
export const selectCourtCaseDetailLoading = (state: { courtCases: CourtCaseState }) => state.courtCases.loading.detail;
export const selectCourtCaseMutating = (state: { courtCases: CourtCaseState }) => state.courtCases.loading.mutating;
export const selectCourtCaseError = (state: { courtCases: CourtCaseState }) => state.courtCases.error;

export default courtCaseSlice.reducer;