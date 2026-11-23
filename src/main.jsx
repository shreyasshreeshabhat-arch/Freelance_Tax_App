import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { RouterProvider } from './context/RouterContext';
import { SystemProvider } from './context/SystemContext';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider>
      <SystemProvider>
        <AuthProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </AuthProvider>
      </SystemProvider>
    </RouterProvider>
  </StrictMode>,
);
