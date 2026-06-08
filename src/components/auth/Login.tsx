// src/components/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clearError, requestOtp, verifyOtp } from '../../store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hook';

interface LocationState {
  from?: {
    pathname: string;
  };
}

export const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Extract dynamic authentication values straight from the Redux store
  const { isLoading, error, otpRequested, accessToken, user } = useAppSelector((state) => state.auth);

  // Component local element states
  const [pjNumber, setPjNumber] = useState('');
  const [otp, setOtp] = useState('');

  // Clear out lingering operational error banners when toggling between lifecycle steps
  useEffect(() => {
    dispatch(clearError());
  }, [otpRequested, dispatch]);

  // Route the authenticated user to their role-specific dashboard upon token resolution
  useEffect(() => {
    if (accessToken && user) {
      const state = location.state as LocationState;
      
      // If they were intercepted trying to access a deep link, honor that intent first
      if (state?.from?.pathname) {
        navigate(state.from.pathname, { replace: true });
        return;
      }

      // Dynamic Role Fallback Navigation Logic
      switch (user.role) {
        
        case 'admin':
          navigate('/admin/dashboard', { replace: true });
          
          break;
      }
    }
  }, [accessToken, user, navigate, location.state]);

  /**
   * Phase 1 Execution: Dispatches PJ request block
   */
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pjNumber.trim()) return;
    dispatch(requestOtp(pjNumber.trim()));
  };

  /**
   * Phase 2 Execution: Verifies credentials block
   */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pjNumber.trim() || !otp.trim()) return;
    dispatch(verifyOtp({ pj_number: pjNumber.trim(), otp: otp.trim() }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 font-sans antialiased">
      <div className="w-full max-w-[420px] rounded-lg bg-white p-8 md:p-10 shadow-lg ring-1 ring-stone-200/60">
        
        {/* High Court Branded Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1E4620] text-[#C29B38]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 uppercase">Office of the Chief Registrar</h1>
          <p className="mt-1 text-xs font-semibold tracking-wider text-[#A37F2B] uppercase">Supreme Court of Kenya</p>
        </div>

        {/* Global Error Banner Display */}
        {error && (
          <div className="mb-5 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-700 rounded-r-md">
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic Context Step Form Switching */}
        {!otpRequested ? (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pjNumber" className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                PJ / Personnel Number
              </label>
              <input
                id="pjNumber"
                type="text"
                placeholder="e.g., PJ1001"
                value={pjNumber}
                onChange={(e) => setPjNumber(e.target.value)}
                disabled={isLoading}
                className="w-full rounded border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#1E4620] focus:ring-1 focus:ring-[#1E4620] disabled:bg-stone-50 disabled:text-stone-400"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full rounded bg-[#1E4620] py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#163317] focus:outline-none focus:ring-2 focus:ring-[#1E4620] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing Request...' : 'Request Access Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
            <div className="border-l-4 border-[#1E4620] bg-emerald-50/60 p-3 text-sm text-[#1E4620] rounded-r-md">
              <p className="leading-relaxed text-xs">
                A secure 6-digit verification code has been dispatched to your registered official mailbox profile.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="otpCode" className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Verification Token
              </label>
              <input
                id="otpCode"
                type="text"
                placeholder="0 0 0 0 0 0"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Numeric parsing only
                disabled={isLoading}
                className="w-full rounded border border-stone-300 bg-white px-3 py-2.5 text-center text-xl font-bold tracking-[0.3em] text-stone-900 outline-none transition placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-stone-400 focus:border-[#1E4620] focus:ring-1 focus:ring-[#1E4620] disabled:bg-stone-50 disabled:text-stone-400"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full rounded bg-[#1E4620] py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#163317] focus:outline-none focus:ring-2 focus:ring-[#1E4620] focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying Challenge...' : 'Verify & Grant Access'}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setOtp('');
                dispatch(clearError());
              }}
              className="mt-1 text-center text-xs text-stone-500 underline transition hover:text-[#A37F2B] disabled:no-underline"
            >
              Modify PJ Number Entry
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;