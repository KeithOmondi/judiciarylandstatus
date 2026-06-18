// src/pages/user/UserProfile.tsx
import React, { useEffect, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchCurrentUser,
  updateCurrentUser,
  clearError,
  clearSuccess,
  selectCurrentUser,
  selectUsersProfileLoading,
  selectUsersMutating,
  selectUsersError,
  selectUsersSuccess,
} from '../../store/slices/userSlice';

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
   MAIN COMPONENT
============================================================ */

const UserProfile = () => {
  const dispatch = useAppDispatch();

  // Selectors
  const currentUser = useAppSelector(selectCurrentUser);
  const profileLoading = useAppSelector(selectUsersProfileLoading); // fetch loading
  const mutating = useAppSelector(selectUsersMutating);             // save loading
  const error = useAppSelector(selectUsersError);
  const success = useAppSelector(selectUsersSuccess);

  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', email: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load user data on mount
  useEffect(() => {
    if (!currentUser) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, currentUser]);

  // Handle success toast — no local setState here to avoid cascading render warning
  useEffect(() => {
    if (success) {
      toast.success('Profile updated successfully');
      dispatch(clearSuccess());
    }
  }, [success, dispatch]);

  // Handle error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    } else if (formData.full_name.length > 100) {
      errors.full_name = 'Full name cannot exceed 100 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address';
    } else if (formData.email.length > 255) {
      errors.email = 'Email cannot exceed 255 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await dispatch(
        updateCurrentUser({
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
        })
      ).unwrap();
      // Close edit mode here — not inside a useEffect — to avoid cascading render lint warning
      setIsEditing(false);
    } catch (err) {
      // Error handled by slice → shown via toast effect above
      console.error('Update profile error:', err);
    }
  };

  const handleEditClick = () => {
    if (currentUser) {
      setFormData({
        full_name: currentUser.full_name || '',
        email: currentUser.email || '',
      });
    }
    setFormErrors({});
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (currentUser) {
      setFormData({
        full_name: currentUser.full_name || '',
        email: currentUser.email || '',
      });
    }
    setFormErrors({});
    setIsEditing(false);
  };

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'Never';
    return new Intl.DateTimeFormat('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  /* ---- Loading / error states ---- */

  if (profileLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="md" />
          <p className="text-sm text-slate-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Unable to load profile</p>
          <button
            onClick={() => dispatch(fetchCurrentUser())}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ---- Main render ---- */

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <Toaster position="top-right" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View and manage your account information
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Avatar Section */}
          <div className="px-6 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                {getInitials(currentUser.full_name)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{currentUser.full_name}</h2>
                <p className="text-sm text-slate-500">
                  {currentUser.role === 'admin' ? 'Administrator' : 'User'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      currentUser.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {currentUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-400">PJ: {currentUser.pj_number}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form / Display Section */}
          <div className="px-6 py-6">
            {isEditing ? (
              <form onSubmit={handleSubmit} noValidate>
                <div className="space-y-4">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className={`w-full rounded-md border ${
                        formErrors.full_name ? 'border-red-300' : 'border-slate-200'
                      } bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Enter your full name"
                      required
                    />
                    {formErrors.full_name && (
                      <span className="text-xs text-red-500">{formErrors.full_name}</span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full rounded-md border ${
                        formErrors.email ? 'border-red-300' : 'border-slate-200'
                      } bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Enter your email address"
                      required
                    />
                    {formErrors.email && (
                      <span className="text-xs text-red-500">{formErrors.email}</span>
                    )}
                  </div>

                  {/* Read-only fields */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        PJ Number
                      </label>
                      <p className="text-sm text-slate-900 font-mono mt-1">
                        {currentUser.pj_number}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Role
                      </label>
                      <p className="text-sm text-slate-900 mt-1 capitalize">{currentUser.role}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={mutating}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
                    >
                      {mutating && <Spinner />}
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={mutating}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Display Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Full Name
                    </label>
                    <p className="text-sm text-slate-900 mt-1">{currentUser.full_name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Email Address
                    </label>
                    <p className="text-sm text-slate-900 mt-1">{currentUser.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      PJ Number
                    </label>
                    <p className="text-sm text-slate-900 font-mono mt-1">{currentUser.pj_number}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Role
                    </label>
                    <p className="text-sm text-slate-900 mt-1 capitalize">{currentUser.role}</p>
                  </div>
                </div>

                {/* Account Details */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Member Since
                      </label>
                      <p className="text-sm text-slate-900 mt-1">
                        {formatDate(currentUser.created_at)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Last Login
                      </label>
                      <p className="text-sm text-slate-900 mt-1">
                        {formatDate(currentUser.last_login)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Edit Button */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Account Information</h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">User ID</span>
                <span className="text-slate-900 font-mono text-xs">{currentUser.id}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">Status</span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    currentUser.is_active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {currentUser.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50 sm:border-b-0">
                <span className="text-slate-500">Account Created</span>
                <span className="text-slate-900">{formatDate(currentUser.created_at)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Last Updated</span>
                <span className="text-slate-900">{formatDate(currentUser.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;