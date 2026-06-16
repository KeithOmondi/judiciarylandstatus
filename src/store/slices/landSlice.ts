// store/slices/landSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES - Aligned with Backend Schema
============================================================ */

export interface LandStatus {
  id: number;
  county: string;
  file_ref: string | null;
  property: string | null;
  title_percil_number: string | null;
  acreage: string | null;
  location: string | null;
  status: string | null;
  current_intended_use: string | null;
  ownership_status: string | null;
  possessions: string | null;
  fencing: string | null;
  disputes: string | null;
  recommendation: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLandStatusDto {
  county: string;
  file_ref?: string;
  property?: string;
  title_percil_number?: string;
  acreage?: string;
  location?: string;
  status?: string;
  current_intended_use?: string;
  ownership_status?: string;
  possessions?: string;
  fencing?: string;
  disputes?: string;
  recommendation?: string;
}

// REMOVED: UpdateLandStatusDto - use Partial<CreateLandStatusDto> directly

export interface LandStatusFilters {
  county?: string;
  file_ref?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'county' | 'file_ref' | 'property' | 'status';
  sort_order?: 'ASC' | 'DESC';
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SummaryStats {
  total_properties: number;
  counties: number;
}

interface LandStatusResponse {
  data: LandStatus[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: SummaryStats;
}

interface LandStatusState {
  records: LandStatus[];
  selectedRecord: LandStatus | null;
  pagination: PaginationMeta;
  summary: SummaryStats | null;
  filters: LandStatusFilters;
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

const initialState: LandStatusState = {
  records: [],
  selectedRecord: null,
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

const buildQueryString = (filters: LandStatusFilters): string => {
  const params = new URLSearchParams();
  (Object.keys(filters) as (keyof LandStatusFilters)[]).forEach((key) => {
    const val = filters[key];
    if (val !== undefined && val !== null && val !== '') {
      params.append(key, String(val));
    }
  });
  return params.toString();
};

// Helper to format acreage
export const formatAcreage = (acreage: string | null): string => {
  if (!acreage) return '—';
  return acreage;
};

// Helper to get status badge color
export const getStatusBadgeClass = (status: string | null): string => {
  if (!status) return 'bg-gray-100 text-gray-700';
  
  const statusLower = status.toLowerCase();
  if (statusLower.includes('uprojected')) return 'bg-amber-100 text-amber-700';
  if (statusLower.includes('owned')) return 'bg-emerald-100 text-emerald-700';
  if (statusLower.includes('disputed')) return 'bg-red-100 text-red-700';
  if (statusLower.includes('pending')) return 'bg-blue-100 text-blue-700';
  if (statusLower.includes('completed')) return 'bg-green-100 text-green-700';
  
  return 'bg-gray-100 text-gray-700';
};

/* ============================================================
   ASYNC THUNKS
============================================================ */

// Fetch all land status records with filters
export const fetchLandStatus = createAsyncThunk(
  'landStatus/fetchAll',
  async (filters: LandStatusFilters, { rejectWithValue }) => {
    try {
      const qs = buildQueryString(filters);
      const response = await axiosClient.get(`/land-status?${qs}`);
      return response.data.data as LandStatusResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Fetch land status by ID
export const fetchLandStatusById = createAsyncThunk(
  'landStatus/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/land-status/${id}`);
      return response.data.data as LandStatus;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Create new land status record
export const createLandStatus = createAsyncThunk(
  'landStatus/create',
  async (payload: CreateLandStatusDto, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/land-status', payload);
      return response.data.data as LandStatus;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Update land status record - Use Partial<CreateLandStatusDto> directly
export const updateLandStatus = createAsyncThunk(
  'landStatus/update',
  async ({ id, payload }: { id: number; payload: Partial<CreateLandStatusDto> }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/land-status/${id}`, payload);
      return response.data.data as LandStatus;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Delete land status record
export const deleteLandStatus = createAsyncThunk(
  'landStatus/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/land-status/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const landSlice = createSlice({
  name: 'landStatus',
  initialState,
  reducers: {
    // ✅ FIXED: removed forced page: 1 – now respects the payload
    setFilters(state, action: PayloadAction<Partial<LandStatusFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = { page: 1, limit: 20 };
    },
    clearSelectedRecord(state) {
      state.selectedRecord = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    /* ---------- FETCH ALL ---------- */
    builder
      .addCase(fetchLandStatus.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchLandStatus.fulfilled, (state, action) => {
        state.loading.list = false;
        state.records = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
        state.summary = action.payload.summary;
      })
      .addCase(fetchLandStatus.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH BY ID ---------- */
    builder
      .addCase(fetchLandStatusById.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchLandStatusById.fulfilled, (state, action) => {
        state.loading.detail = false;
        state.selectedRecord = action.payload;
      })
      .addCase(fetchLandStatusById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    /* ---------- CREATE ---------- */
    builder
      .addCase(createLandStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(createLandStatus.fulfilled, (state, action) => {
        state.loading.mutating = false;
        state.records.unshift(action.payload);
        state.pagination.total += 1;
        if (state.summary) {
          state.summary.total_properties += 1;
        }
      })
      .addCase(createLandStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- UPDATE ---------- */
    builder
      .addCase(updateLandStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(updateLandStatus.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const idx = state.records.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.records[idx] = action.payload;
        if (state.selectedRecord?.id === action.payload.id) state.selectedRecord = action.payload;
      })
      .addCase(updateLandStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- DELETE ---------- */
    builder
      .addCase(deleteLandStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(deleteLandStatus.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const deletedRecord = state.records.find((r) => r.id === action.payload);
        state.records = state.records.filter((r) => r.id !== action.payload);
        if (state.selectedRecord?.id === action.payload) state.selectedRecord = null;
        state.pagination.total -= 1;
        if (state.summary && deletedRecord) {
          state.summary.total_properties -= 1;
        }
      })
      .addCase(deleteLandStatus.rejected, (state, action) => {
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
  clearSelectedRecord, 
  clearError 
} = landSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectAllLandStatus = (state: { landStatus: LandStatusState }) => state.landStatus.records;
export const selectSelectedLandRecord = (state: { landStatus: LandStatusState }) => state.landStatus.selectedRecord;
export const selectLandStatusPagination = (state: { landStatus: LandStatusState }) => state.landStatus.pagination;
export const selectLandStatusSummary = (state: { landStatus: LandStatusState }) => state.landStatus.summary;
export const selectLandStatusFilters = (state: { landStatus: LandStatusState }) => state.landStatus.filters;

export const selectLandStatusListLoading = (state: { landStatus: LandStatusState }) => state.landStatus.loading.list;
export const selectLandStatusDetailLoading = (state: { landStatus: LandStatusState }) => state.landStatus.loading.detail;
export const selectLandStatusMutating = (state: { landStatus: LandStatusState }) => state.landStatus.loading.mutating;
export const selectLandStatusError = (state: { landStatus: LandStatusState }) => state.landStatus.error;

// Computed selectors
export const selectTotalProperties = (state: { landStatus: LandStatusState }) => 
  state.landStatus.summary?.total_properties ?? 0;

export const selectTotalCounties = (state: { landStatus: LandStatusState }) => 
  state.landStatus.summary?.counties ?? 0;

export default landSlice.reducer;