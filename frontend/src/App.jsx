import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import './index.css';

const Login         = lazy(() => import('./pages/Login'));
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const InvoiceList   = lazy(() => import('./pages/InvoiceList'));
const InvoiceForm   = lazy(() => import('./pages/InvoiceForm'));
const InvoicePreview = lazy(() => import('./pages/InvoicePreview'));
const ReceiptList   = lazy(() => import('./pages/ReceiptList'));
const ReceiptForm   = lazy(() => import('./pages/ReceiptForm'));
const ReceiptPreview = lazy(() => import('./pages/ReceiptPreview'));
const Settings      = lazy(() => import('./pages/Settings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="invoices/preschool" element={<InvoiceList category="preschool" />} />
                  <Route path="invoices/primary" element={<InvoiceList category="primary" />} />
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
