// src/pages/admin/AdminUsers.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  deleteUser,
  fetchUserStats,
  setFilters,
  resetFilters,
  clearSelectedUser,
  clearError,
  selectAllUsers,
  selectSelectedUser,
  selectUserPagination,
  selectUserStats,
  selectUserFilters,
  selectUsersListLoading,
  selectUsersMutating,
  selectUsersError,
  selectUsersSuccess,
  type User,
  type CreateUserInput,
  type UpdateUserInput,
  clearSuccess,
} from '../../store/slices/userSlice';

/* ============================================================
   TYPES
============================================================ */

type UserRole = 'admin' | 'user';

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
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeleteModal = ({ user, onConfirm, onCancel, loading }: DeleteModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-100 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900">Delete User</h3>
          <p className="mt-1 text-sm text-slate-500">
            This will deactivate the user account for{' '}
            <span className="font-medium text-slate-700">{user.full_name}</span>
            . The user will no longer be able to access the system.
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
          Deactivate User
        </button>
      </div>
    </div>
  </div>
);

/* ============================================================
   USER MODAL (ADD/EDIT)
============================================================ */

interface UserModalProps {
  initialUser: User | null;
  onSubmit: (data: CreateUserInput | UpdateUserInput) => void;
  onClose: () => void;
  loading: boolean;
}

const UserModal = ({ initialUser, onSubmit, onClose, loading }: UserModalProps) => {
  const isEdit = !!initialUser;

  // Use discriminated union for form state
  const [form, setForm] = useState<CreateUserInput | UpdateUserInput>(() => {
    if (initialUser) {
      return {
        full_name: initialUser.full_name || '',
        email: initialUser.email || '',
        role: initialUser.role || 'user',
      };
    }
    return {
      full_name: '',
      email: '',
      pj_number: '',
      role: 'user',
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validate full_name
    if (!form.full_name?.trim()) {
      newErrors.full_name = 'Full name is required';
    } else if (form.full_name.length > 100) {
      newErrors.full_name = 'Full name cannot exceed 100 characters';
    }

    // Validate email
    if (!form.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email address';
    } else if (form.email.length > 255) {
      newErrors.email = 'Email cannot exceed 255 characters';
    }

    // Validate pj_number only for create
    if (!isEdit) {
      const createForm = form as CreateUserInput;
      if (!createForm.pj_number?.trim()) {
        newErrors.pj_number = 'PJ number is required';
      } else if (createForm.pj_number.length > 50) {
        newErrors.pj_number = 'PJ number cannot exceed 50 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  // Helper to get pj_number value safely
  const getPjNumber = (): string => {
    if ('pj_number' in form) {
      return form.pj_number || '';
    }
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg my-8 rounded-xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? 'Edit User' : 'Add New User'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? `Editing ${initialUser?.full_name}` : 'Create a new user account'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Full Name *
              </label>
              <input
                className={`w-full rounded-md border ${
                  errors.full_name ? 'border-red-300' : 'border-slate-200'
                } bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={form.full_name || ''}
                onChange={(e) => setField('full_name', e.target.value)}
                placeholder="e.g., John Doe"
                required
              />
              {errors.full_name && <span className="text-xs text-red-500">{errors.full_name}</span>}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Email *
              </label>
              <input
                type="email"
                className={`w-full rounded-md border ${
                  errors.email ? 'border-red-300' : 'border-slate-200'
                } bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={form.email || ''}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="e.g., john@example.com"
                required
              />
              {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
            </div>

            {/* PJ Number (only for create) */}
            {!isEdit && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  PJ Number *
                </label>
                <input
                  className={`w-full rounded-md border ${
                    errors.pj_number ? 'border-red-300' : 'border-slate-200'
                  } bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase`}
                  value={getPjNumber()}
                  onChange={(e) => setField('pj_number', e.target.value.toUpperCase())}
                  placeholder="e.g., PJ1001"
                  required
                />
                {errors.pj_number && <span className="text-xs text-red-500">{errors.pj_number}</span>}
              </div>
            )}

            {/* Role */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Role *
              </label>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.role || 'user'}
                onChange={(e) => setField('role', e.target.value)}
                required
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {loading && <Spinner />}
              {isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   PAGINATION
============================================================ */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 3) {
        start = 2;
        end = maxVisible - 1;
      }
      if (currentPage >= totalPages - 2) {
        start = totalPages - (maxVisible - 2);
        end = totalPages - 1;
      }
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center gap-1">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
        aria-label="Previous page"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      {getPageNumbers().map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400 select-none">
            ...
          </span>
        ) : (
          <button
            key={`page-${page}`}
            onClick={() => onPageChange(page as number)}
            className={`w-8 h-8 rounded-md text-xs font-medium transition ${
              page === currentPage ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
        aria-label="Next page"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

const AdminUsers = () => {
  const dispatch = useAppDispatch();

  // Selectors
  const users = useAppSelector(selectAllUsers);
  const selectedUser = useAppSelector(selectSelectedUser);
  const pagination = useAppSelector(selectUserPagination);
  const stats = useAppSelector(selectUserStats);
  const filters = useAppSelector(selectUserFilters);
  const listLoading = useAppSelector(selectUsersListLoading);
  const mutating = useAppSelector(selectUsersMutating);
  const error = useAppSelector(selectUsersError);
  const success = useAppSelector(selectUsersSuccess);

  // Local state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [roleFilter, setRoleFilter] = useState(filters.role || '');

  // Fetch data on mount and filter changes
  useEffect(() => {
    dispatch(fetchUsers(filters));
    dispatch(fetchUserStats());
  }, [dispatch, filters]);

  // Toast notifications - only from slice state
  useEffect(() => {
    if (success) {
      toast.success('Operation completed successfully');
      dispatch(clearSuccess());
    }
  }, [success, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        dispatch(setFilters({ search: searchInput || undefined, page: 1 }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, dispatch, filters.search]);

  // Role filter
  useEffect(() => {
    const timer = setTimeout(() => {
      if (roleFilter !== filters.role) {
        dispatch(setFilters({ role: (roleFilter as UserRole) || undefined, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [roleFilter, dispatch, filters.role]);

  const handlePageChange = useCallback(
    (page: number) => {
      dispatch(setFilters({ page }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [dispatch]
  );

  const openAddModal = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    dispatch(fetchUserById(user.id));
    setEditingUser(user);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    dispatch(clearSelectedUser());
  };

  const handleCreateUser = async (data: CreateUserInput | UpdateUserInput) => {
    try {
      // Type guard to ensure we have pj_number for create
      if (!('pj_number' in data) || !data.pj_number) {
        toast.error('PJ number is required');
        return;
      }
      
      // Ensure all required fields are present
      const createData: CreateUserInput = {
        full_name: data.full_name || '',
        email: data.email || '',
        pj_number: data.pj_number,
        role: data.role || 'user',
      };
      
      await dispatch(createUser(createData)).unwrap();
      // Toast will be shown by the success useEffect above
      closeModal();
    } catch (err) {
      // Error handled in slice and shown via toast
      console.error('Create user error:', err);
    }
  };

  const handleUpdateUser = async (data: CreateUserInput | UpdateUserInput) => {
    if (!editingUser) return;
    try {
      // Build the update payload explicitly — UpdateUserInput has no
      // pj_number field, so we allow-list the fields it actually accepts
      // instead of destructuring/stripping from the union type.
      const updateData: UpdateUserInput = {
        full_name: data.full_name,
        email: data.email,
        role: data.role,
      };
      await dispatch(updateUser({ id: editingUser.id, data: updateData })).unwrap();
      // Toast will be shown by the success useEffect above
      closeModal();
    } catch (err) {
      // Error handled in slice and shown via toast
      console.error('Update user error:', err);
    }
  };

  const handleSubmit = (data: CreateUserInput | UpdateUserInput) => {
    if (editingUser) {
      handleUpdateUser(data);
    } else {
      handleCreateUser(data);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteUser(deleteTarget.id)).unwrap();
      // Toast will be shown by the success useEffect above
      setDeleteTarget(null);
    } catch (err) {
      // Error handled in slice and shown via toast
      console.error('Delete user error:', err);
    }
  };

  const handleResetFilters = () => {
    dispatch(resetFilters());
    setSearchInput('');
    setRoleFilter('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const getRoleBadgeClass = (role: UserRole) => {
    return role === 'admin'
      ? 'bg-purple-100 text-purple-700'
      : 'bg-blue-100 text-blue-700';
  };

  const getStatusBadgeClass = (isActive: boolean) => {
    return isActive
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-red-100 text-red-700';
  };

  const headers = [
    'Name',
    'Email',
    'PJ Number',
    'Role',
    'Status',
    'Created',
    'Actions',
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Modals */}
      {modalOpen && (
        <UserModal
          initialUser={editingUser ? (selectedUser ?? editingUser) : null}
          onSubmit={handleSubmit}
          onClose={closeModal}
          loading={mutating}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">User Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {pagination.total.toLocaleString()} user{pagination.total !== 1 ? 's' : ''} found
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Total Users</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Active Users</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.activeUsers}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Admins</p>
              <p className="text-2xl font-bold text-purple-600">{stats.adminCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase">Regular Users</p>
              <p className="text-2xl font-bold text-blue-600">{stats.userCount}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email, PJ number..."
                className="pl-9 pr-3 py-2 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <button
              onClick={handleResetFilters}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition"
            >
              Reset filters
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {headers.map((header, idx) => (
                    <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td colSpan={headers.length} className="py-20 text-center">
                      <div className="flex justify-center">
                        <Spinner size="md" />
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="py-20 text-center text-slate-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <span>{user.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{user.pj_number}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(user.is_active)}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition"
                            title="Deactivate"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
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

          {!listLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total.toLocaleString()}
              </span>
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;