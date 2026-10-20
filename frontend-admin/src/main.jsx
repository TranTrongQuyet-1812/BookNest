import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@booknest/shared/auth';
import { ThongBaoProvider } from '@booknest/shared/thongbao';
import App from './App.jsx';
import '../../frontend/src/index.css';
import './admindash.css';
import './backoffice.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ThongBaoProvider>
        <App />
      </ThongBaoProvider>
    </AuthProvider>
  </React.StrictMode>
);
