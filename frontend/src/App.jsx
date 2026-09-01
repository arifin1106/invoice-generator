import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import InvoiceForm from './pages/InvoiceForm';
import InvoicePreview from './pages/InvoicePreview';
import ReceiptList from './pages/ReceiptList';
import ReceiptForm from './pages/ReceiptForm';
import ReceiptPreview from './pages/ReceiptPreview';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { 
      retry: 1, 
      staleTime: 60_000, 
      gcTime: 1000 * 60 * 60 * 24 
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="invoices/new" element={<InvoiceForm />} />
                <Route path="invoices/:id/edit" element={<InvoiceForm />} />
                <Route path="invoices/:id/preview" element={<InvoicePreview />} />
                <Route path="receipts" element={<ReceiptList />} />
                <Route path="receipts/new" element={<ReceiptForm />} />
                <Route path="receipts/:id/edit" element={<ReceiptForm />} />
                <Route path="receipts/:id/preview" element={<ReceiptPreview />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
