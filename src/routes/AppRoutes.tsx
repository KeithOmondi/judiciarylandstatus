import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/auth/LoginPage";
import ProtectedRoutes from "./ProtectedRoutes";
import AdminLayout from "../components/admin/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import { useAppSelector } from "../store/hook";
import AdminCourtCases from "../pages/admin/AdminCourtCases";
import AdminLegalDues from "../pages/admin/AdminLegalDues";
import AdminDemands from "../pages/admin/AdminDemands";
import AdminStaffCriminal from "../pages/admin/AdminStaffCriminal";
import AdminReports from "../pages/admin/AdminReports";
import AdminLands from "../pages/admin/Lands/AdminLands";
import AdminUsers from "../pages/admin/AdminUsers";



const UnauthorizedView = () => (
  <div className="flex min-h-screen items-center justify-center bg-stone-50 text-center px-4">
    <div className="max-w-md rounded-lg bg-white p-8 shadow-md ring-1 ring-stone-200">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold tracking-tight text-stone-900 uppercase">403 - Access Denied</h1>
      <p className="text-stone-500 mt-2 text-sm leading-relaxed">
        Your security profile credentials do not possess the authorization permissions required to inspect this secure workspace.
      </p>
      <a href="/" className="mt-5 inline-block text-xs font-bold tracking-wider uppercase text-[#A37F2B] hover:text-[#1E4620] transition-colors">
        &larr; Return to Workspace Hub
      </a>
    </div>
  </div>
);


const DynamicRootRedirect = () => {
  const { accessToken, user } = useAppSelector((state) => state.auth);

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  // Route them clean into their active role-specific control grids
  switch (user.role) {
 
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    
  }
};

const AppRoutes = () => {
  return (
    <Routes>
         {/* 1. Public Authentication Entry Points */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedView />} />
      
      {/* Index handler sorting logged state direction */}
      <Route path="/" element={<DynamicRootRedirect />} />


      <Route element={<ProtectedRoutes allowedRoles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/court-cases" element={<AdminCourtCases />} />
          <Route path="/admin/legal-dues" element={<AdminLegalDues />} />
          <Route path="/admin/demands" element={<AdminDemands />} />
          <Route path="/admin/staff-criminal" element={<AdminStaffCriminal />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/land" element={<AdminLands />} />
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>
      </Route> 
    </Routes>
  )
}

export default AppRoutes