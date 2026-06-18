// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import courtCasesReducer from './slices/courtCaseSlice'
import legalDuesReducer from "./slices/legalduesSlice"
import { injectStore } from '../api/api';
import demandsReducer from "./slices/demandsSlice"
import staffCasesReducer from "./slices/staffCasesSlice"
import landStatusReducer from "./slices/landSlice"
import streamFileReducer from "./slices/streamSlice"
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    courtCases: courtCasesReducer,
    legalDues: legalDuesReducer,
    demands: demandsReducer,
    staffCases: staffCasesReducer,
    landStatus: landStatusReducer,
    streamFile: streamFileReducer,
    users: userReducer,
  },
});

// Dynamically inject our store instance into the Axios interceptor array cleanly at runtime
injectStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;