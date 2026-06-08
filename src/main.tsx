// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';
import { store } from './store/store.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          success: { style: { background: '#7B2FBE', color: '#fff' } },
          error:   { style: { background: '#1A1A2E', color: '#fff' } },
        }}
      />
    </Provider>
  </StrictMode>
);