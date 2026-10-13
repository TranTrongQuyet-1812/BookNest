import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@booknest/shared/auth';
import App from './App.jsx';
import '../../frontend/src/index.css';
import './backoffice.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider><App /></AuthProvider>
  </React.StrictMode>
);
