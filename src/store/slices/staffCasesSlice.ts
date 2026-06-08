// store/slices/staffCasesSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES - Aligned with Backend Schema
============================================================ */

export type EmploymentAction = 
  | 'suspension' 
  | 'interdiction' 
  | 'termination' 
  | 'dismissal' 
  | 'disciplinary_warning' 
  | 'none';

export interface StaffCriminalCase {
  id: number;
  name: string;
  designation: string;
  station: string;
  date_of_reporting: string;
  nature_of_offence: string;
  court_file_ref: string | null;
  latest_action: EmploymentAction;
  hearing_conviction_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffCaseDto {
  name: string;
  designation: string;
  station: string;
  date_of_reporting: string;
  nature_of_offence: string;
  court_file_ref?: string;
  latest_action: EmploymentAction;
  hearing_conviction_date?: string;
}

// FIX: Remove the empty interface, use Partial<CreateStaffCaseDto> directly in the thunk
// Instead of:
// export interface UpdateStaffCaseDto extends Partial<CreateStaffCaseDto> {}
// Just use Partial<CreateStaffCaseDto> where needed

export interface StaffCaseFilters {
  name?: string;
  station?: string;
  latest_action?: EmploymentAction;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'date_of_reporting' | 'station' | 'latest_action';
  sort_order?: 'ASC' | 'DESC';
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SummaryStats {
  total_cases: number;
  suspension_count: number;
  interdiction_count: number;
}

interface StaffCasesResponse {
  data: StaffCriminalCase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: SummaryStats;
}

interface StaffCasesState {
  cases: StaffCriminalCase[];
  selectedCase: StaffCriminalCase | null;
  pagination: PaginationMeta;
  summary: SummaryStats | null;
  filters: StaffCaseFilters;
  loading: {
    list: boolean;
    detail: boolean;
    mutating: boolean;
  };
  error: string | null;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: StaffCasesState = {
  cases: [],
  selectedCase: null,
  pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
  summary: null,
  filters: { page: 1, limit: 20 },
  loading: {
    list: false,
    detail: false,
    mutating: false,
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

const buildQueryString = (filters: StaffCaseFilters): string => {
  const params = new URLSearchParams();
  (Object.keys(filters) as (keyof StaffCaseFilters)[]).forEach((key) => {
    const val = filters[key];
    if (val !== undefined && val !== null && val !== '') {
      params.append(key, String(val));
    }
  });
  return params.toString();
};

// Helper to get action badge color
export const getActionBadgeClass = (action: EmploymentAction): string => {
  const classes: Record<EmploymentAction, string> = {
    suspension: 'bg-amber-100 text-amber-700',
    interdiction: 'bg-red-100 text-red-700',
    termination: 'bg-rose-100 text-rose-700',
    dismissal: 'bg-purple-100 text-purple-700',
    disciplinary_warning: 'bg-yellow-100 text-yellow-700',
    none: 'bg-gray-100 text-gray-700',
  };
  return classes[action] || 'bg-slate-100 text-slate-700';
};

// Helper to get action label
export const getActionLabel = (action: EmploymentAction): string => {
  const labels: Record<EmploymentAction, string> = {
    suspension: 'Suspension',
    interdiction: 'Interdiction',
    termination: 'Termination',
    dismissal: 'Dismissal',
    disciplinary_warning: 'Disciplinary Warning',
    none: 'None',
  };
  return labels[action] || action;
};

// Helper to format date
export const formatDate = (date: string | null): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ============================================================
   ASYNC THUNKS
============================================================ */

// Fetch all staff cases with filters
export const fetchStaffCases = createAsyncThunk(
  'staffCases/fetchAll',
  async (filters: StaffCaseFilters, { rejectWithValue }) => {
    try {
      const qs = buildQueryString(filters);
      const response = await axiosClient.get(`/staff-cases?${qs}`);
      return response.data.data as StaffCasesResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Fetch staff case by ID
export const fetchStaffCaseById = createAsyncThunk(
  'staffCases/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/staff-cases/${id}`);
      return response.data.data as StaffCriminalCase;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Create new staff case
export const createStaffCase = createAsyncThunk(
  'staffCases/create',
  async (payload: CreateStaffCaseDto, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/staff-cases', payload);
      return response.data.data as StaffCriminalCase;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Update staff case - Use Partial<CreateStaffCaseDto> directly
export const updateStaffCase = createAsyncThunk(
  'staffCases/update',
  async ({ id, payload }: { id: number; payload: Partial<CreateStaffCaseDto> }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/staff-cases/${id}`, payload);
      return response.data.data as StaffCriminalCase;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Delete staff case
export const deleteStaffCase = createAsyncThunk(
  'staffCases/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/staff-cases/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const staffCasesSlice = createSlice({
  name: 'staffCases',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<StaffCaseFilters>>) {
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
      .addCase(fetchStaffCases.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchStaffCases.fulfilled, (state, action) => {
        state.loading.list = false;
        state.cases = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
        state.summary = action.payload.summary;
      })
      .addCase(fetchStaffCases.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH BY ID ---------- */
    builder
      .addCase(fetchStaffCaseById.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchStaffCaseById.fulfilled, (state, action) => {
        state.loading.detail = false;
        state.selectedCase = action.payload;
      })
      .addCase(fetchStaffCaseById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    /* ---------- CREATE ---------- */
    builder
      .addCase(createStaffCase.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(createStaffCase.fulfilled, (state, action) => {
        state.loading.mutating = false;
        state.cases.unshift(action.payload);
        state.pagination.total += 1;
        if (state.summary) {
          state.summary.total_cases += 1;
          if (action.payload.latest_action === 'suspension') {
            state.summary.suspension_count += 1;
          } else if (action.payload.latest_action === 'interdiction') {
            state.summary.interdiction_count += 1;
          }
        }
      })
      .addCase(createStaffCase.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- UPDATE ---------- */
    builder
      .addCase(updateStaffCase.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(updateStaffCase.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const idx = state.cases.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.cases[idx] = action.payload;
        if (state.selectedCase?.id === action.payload.id) state.selectedCase = action.payload;
      })
      .addCase(updateStaffCase.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- DELETE ---------- */
    builder
      .addCase(deleteStaffCase.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(deleteStaffCase.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const deletedCase = state.cases.find((c) => c.id === action.payload);
        state.cases = state.cases.filter((c) => c.id !== action.payload);
        if (state.selectedCase?.id === action.payload) state.selectedCase = null;
        state.pagination.total -= 1;
        if (state.summary && deletedCase) {
          state.summary.total_cases -= 1;
          if (deletedCase.latest_action === 'suspension') {
            state.summary.suspension_count -= 1;
          } else if (deletedCase.latest_action === 'interdiction') {
            state.summary.interdiction_count -= 1;
          }
        }
      })
      .addCase(deleteStaffCase.rejected, (state, action) => {
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
  clearSelectedCase, 
  clearError 
} = staffCasesSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectAllStaffCases = (state: { staffCases: StaffCasesState }) => state.staffCases.cases;
export const selectSelectedStaffCase = (state: { staffCases: StaffCasesState }) => state.staffCases.selectedCase;
export const selectStaffCasesPagination = (state: { staffCases: StaffCasesState }) => state.staffCases.pagination;
export const selectStaffCasesSummary = (state: { staffCases: StaffCasesState }) => state.staffCases.summary;
export const selectStaffCasesFilters = (state: { staffCases: StaffCasesState }) => state.staffCases.filters;

export const selectStaffCasesListLoading = (state: { staffCases: StaffCasesState }) => state.staffCases.loading.list;
export const selectStaffCasesDetailLoading = (state: { staffCases: StaffCasesState }) => state.staffCases.loading.detail;
export const selectStaffCasesMutating = (state: { staffCases: StaffCasesState }) => state.staffCases.loading.mutating;
export const selectStaffCasesError = (state: { staffCases: StaffCasesState }) => state.staffCases.error;

// Computed selectors
export const selectTotalCases = (state: { staffCases: StaffCasesState }) => 
  state.staffCases.summary?.total_cases ?? 0;

export const selectSuspensionCount = (state: { staffCases: StaffCasesState }) => 
  state.staffCases.summary?.suspension_count ?? 0;

export const selectInterdictionCount = (state: { staffCases: StaffCasesState }) => 
  state.staffCases.summary?.interdiction_count ?? 0;

export default staffCasesSlice.reducer;