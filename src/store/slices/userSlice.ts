// src/store/slices/userSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES
============================================================ */

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  full_name: string;
  email: string;
  pj_number: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
}

export interface CreateUserInput {
  full_name: string;
  email: string;
  pj_number: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  full_name?: string;
  email?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  is_active?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'full_name' | 'email' | 'pj_number' | 'role' | 'created_at' | 'updated_at' | 'last_login';
  sort_order?: 'ASC' | 'DESC';
}

export interface UserPaginationResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  userCount: number;
}

interface UserState {
  users: User[];
  selectedUser: User | null;
  currentUser: User | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: UserStats | null;
  filters: UserFilters;
  loading: {
    list: boolean;
    detail: boolean;
    mutating: boolean;
    profile: boolean;
  };
  error: string | null;
  success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: UserState = {
  users: [],
  selectedUser: null,
  currentUser: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },
  stats: null,
  filters: {
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'DESC',
  },
  loading: {
    list: false,
    detail: false,
    mutating: false,
    profile: false,
  },
  error: null,
  success: false,
};

/* ============================================================
   HELPERS
============================================================ */

const extractErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

/* ============================================================
   ASYNC THUNKS
============================================================ */

/**
 * Fetch all users with pagination and filters
 */
export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (filters: UserFilters, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await axiosClient.get(`/users?${params.toString()}`);
      return response.data.data as UserPaginationResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Fetch a single user by ID
 */
export const fetchUserById = createAsyncThunk(
  'users/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/users/${id}`);
      return response.data.data as User;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Get current user profile
 */
export const fetchCurrentUser = createAsyncThunk(
  'users/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/users/me');
      return response.data.data as User;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Update current user profile
 */
export const updateCurrentUser = createAsyncThunk(
  'users/updateCurrentUser',
  async (data: { full_name?: string; email?: string }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put('/users/me', data);
      return response.data.data as User;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Create a new user (Admin only)
 */
export const createUser = createAsyncThunk(
  'users/create',
  async (userData: CreateUserInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/users', userData);
      return response.data.data as User;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Update a user (Admin only)
 */
export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, data }: { id: string; data: UpdateUserInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/users/${id}`, data);
      return response.data.data as User;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Soft delete a user (deactivate)
 */
export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/users/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Permanently delete a user
 */
export const hardDeleteUser = createAsyncThunk(
  'users/hardDelete',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/users/${id}/permanent`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Get user statistics
 */
export const fetchUserStats = createAsyncThunk(
  'users/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/users/stats');
      return response.data.data as UserStats;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<UserFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'DESC',
      };
    },
    clearSelectedUser(state) {
      state.selectedUser = null;
    },
    clearError(state) {
      state.error = null;
    },
    clearSuccess(state) {
      state.success = false;
    },
    resetUserState: () => initialState,
  },
  extraReducers: (builder) => {
    /* ---------- FETCH ALL USERS ---------- */
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<UserPaginationResponse>) => {
        state.loading.list = false;
        state.users = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH USER BY ID ---------- */
    builder
      .addCase(fetchUserById.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading.detail = false;
        state.selectedUser = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH CURRENT USER ---------- */
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading.profile = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading.profile = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading.profile = false;
        state.error = action.payload as string;
      });

    /* ---------- UPDATE CURRENT USER ---------- */
    builder
      .addCase(updateCurrentUser.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading.mutating = false;
        state.currentUser = action.payload;
        state.success = true;
        // Update in users list if present
        const index = state.users.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      .addCase(updateCurrentUser.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- CREATE USER ---------- */
    builder
      .addCase(createUser.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading.mutating = false;
        state.users = [action.payload, ...state.users];
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        state.success = true;
        if (state.stats) {
          state.stats.totalUsers += 1;
          if (action.payload.role === 'admin') {
            state.stats.adminCount += 1;
          } else {
            state.stats.userCount += 1;
          }
        }
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- UPDATE USER ---------- */
    builder
      .addCase(updateUser.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading.mutating = false;
        const index = state.users.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        if (state.selectedUser?.id === action.payload.id) {
          state.selectedUser = action.payload;
        }
        if (state.currentUser?.id === action.payload.id) {
          state.currentUser = action.payload;
        }
        state.success = true;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- DELETE USER (SOFT) ---------- */
    builder
      .addCase(deleteUser.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(deleteUser.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        const deletedUser = state.users.find((u) => u.id === action.payload);
        state.users = state.users.filter((u) => u.id !== action.payload);
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        state.success = true;
        if (state.stats && deletedUser) {
          state.stats.totalUsers -= 1;
          if (deletedUser.is_active) {
            state.stats.activeUsers -= 1;
          }
          if (deletedUser.role === 'admin') {
            state.stats.adminCount -= 1;
          } else {
            state.stats.userCount -= 1;
          }
        }
        if (state.selectedUser?.id === action.payload) {
          state.selectedUser = null;
        }
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- HARD DELETE USER ---------- */
    builder
      .addCase(hardDeleteUser.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(hardDeleteUser.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        const deletedUser = state.users.find((u) => u.id === action.payload);
        state.users = state.users.filter((u) => u.id !== action.payload);
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        state.success = true;
        if (state.stats && deletedUser) {
          state.stats.totalUsers -= 1;
          if (deletedUser.is_active) {
            state.stats.activeUsers -= 1;
          }
          if (deletedUser.role === 'admin') {
            state.stats.adminCount -= 1;
          } else {
            state.stats.userCount -= 1;
          }
        }
        if (state.selectedUser?.id === action.payload) {
          state.selectedUser = null;
        }
      })
      .addCase(hardDeleteUser.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- FETCH USER STATS ---------- */
    builder
      .addCase(fetchUserStats.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchUserStats.fulfilled, (state, action: PayloadAction<UserStats>) => {
        state.loading.detail = false;
        state.stats = action.payload;
      })
      .addCase(fetchUserStats.rejected, (state, action) => {
        state.loading.detail = false;
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
  clearSelectedUser,
  clearError,
  clearSuccess,
  resetUserState,
} = userSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

// Users list selectors
export const selectAllUsers = (state: { users: UserState }) => state.users.users;
export const selectSelectedUser = (state: { users: UserState }) => state.users.selectedUser;
export const selectCurrentUser = (state: { users: UserState }) => state.users.currentUser;
export const selectUserPagination = (state: { users: UserState }) => state.users.pagination;
export const selectUserStats = (state: { users: UserState }) => state.users.stats;
export const selectUserFilters = (state: { users: UserState }) => state.users.filters;

// Loading states
export const selectUsersListLoading = (state: { users: UserState }) => state.users.loading.list;
export const selectUsersDetailLoading = (state: { users: UserState }) => state.users.loading.detail;
export const selectUsersMutating = (state: { users: UserState }) => state.users.loading.mutating;
export const selectUsersProfileLoading = (state: { users: UserState }) => state.users.loading.profile;

// Error and success
export const selectUsersError = (state: { users: UserState }) => state.users.error;
export const selectUsersSuccess = (state: { users: UserState }) => state.users.success;

// Computed selectors
export const selectTotalUsers = (state: { users: UserState }) => state.users.pagination.total;
export const selectIsAdmin = (state: { users: UserState }) => 
  state.users.currentUser?.role === 'admin';
export const selectIsUser = (state: { users: UserState }) => 
  state.users.currentUser?.role === 'user';

export default userSlice.reducer;