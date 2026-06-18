// pages/UserDashboard.tsx
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchLandStatus,
  selectAllLandStatus,
  selectLandStatusPagination,
  selectLandStatusSummary,
  selectLandStatusListLoading,
  formatAcreage,
  getStatusBadgeClass,
  //type LandStatus,
} from '../../store/slices/landSlice';

const UserDashboard = () => {
  const dispatch = useAppDispatch();

  const records = useAppSelector(selectAllLandStatus);
  const pagination = useAppSelector(selectLandStatusPagination);
  const summary = useAppSelector(selectLandStatusSummary);
  const listLoading = useAppSelector(selectLandStatusListLoading);

  // Fetch initial data
  useEffect(() => {
    dispatch(fetchLandStatus({ page: 1, limit: 5 }));
  }, [dispatch]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back! Here's an overview of your land records.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Properties</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {listLoading ? '...' : summary?.total_properties || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Counties</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {listLoading ? '...' : summary?.counties || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Records</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {listLoading ? '...' : pagination.total}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pages</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {listLoading ? '...' : pagination.totalPages}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Records */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Recent Land Records</h2>
            <Link
              to="/user/land"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
            >
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto">
            {listLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No land records found.</p>
                <Link
                  to="/user/land"
                  className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                >
                  Add your first record →
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Property
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      County
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Acreage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Created
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-[150px] truncate">
                        {record.property || record.file_ref || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{record.county}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatAcreage(record.acreage)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                            record.status
                          )}`}
                        >
                          {record.status || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">
                        {record.location || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          to={`/user/land`}
                          state={{ highlightId: record.id }}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium transition"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!listLoading && records.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">
                Showing {Math.min(records.length, 5)} of {pagination.total} records
              </span>
              <div className="flex gap-2">
                <Link
                  to="/user/land"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition"
                >
                  View all records →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          <Link
            to="/user/land"
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300"
          >
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Add New Record</p>
              <p className="text-xs text-slate-500">Create a new land status record</p>
            </div>
          </Link>

          <Link
            to="/user/land"
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-emerald-300"
          >
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">View Records</p>
              <p className="text-xs text-slate-500">Browse all land status records</p>
            </div>
          </Link>

          <Link
            to="/user/profile"
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-purple-300"
          >
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">My Profile</p>
              <p className="text-xs text-slate-500">View and update your profile</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;