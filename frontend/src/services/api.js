import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || 'Terjadi kesalahan. Coba lagi.';

    const status = error.response?.status;
    const url    = error.config?.url || '';

    if (status === 401 && !url.endsWith('/login')) {
      localStorage.removeItem('auth_token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

export const invoiceApi = {
  list:           (params) => api.get('/invoices', { params }),
  show:           (id)     => api.get(`/invoices/${id}`),
  create:         (data)   => api.post('/invoices', data),
  update:         (id, data) => api.put(`/invoices/${id}`, data),
  remove:         (id)     => api.delete(`/invoices/${id}`),
  generateNumber: ()       => api.get('/invoices/generate-number'),
  pdfUrl:         (id)     => `${api.defaults.baseURL}/invoices/${id}/pdf`,
  shareUrl:       (id)     => api.get(`/invoices/${id}/share-url`),
  downloadPdf: async (id, invoiceNumber) => {
    const response = await api.get(
      `/invoices/${id}/pdf`,
      { responseType: 'blob' }
    );
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url  = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href  = url;
    link.download = `Invoice-${(invoiceNumber || id).replace(/\//g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  exportXlsx:     (studentLevel) => api.get('/invoices/export', {
    params: studentLevel ? { student_level: studentLevel } : {},
    responseType: 'blob',
  }),
  downloadTemplate: () => api.get('/invoices/import-template', { responseType: 'blob' }),
  importXlsx:     (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/invoices/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const settingApi = {
  show:   ()     => api.get('/settings'),
  update: (data) => api.post('/settings', data),
};

export const receiptApi = {
  list:           (params) => api.get('/receipts', { params }),
  show:           (id)     => api.get(`/receipts/${id}`),
  create:         (data)   => api.post('/receipts', data),
  update:         (id, data) => api.put(`/receipts/${id}`, data),
  remove:         (id)     => api.delete(`/receipts/${id}`),
  generateNumber: ()       => api.get('/receipts/generate-number'),
  shareUrl:       (id)     => api.get(`/receipts/${id}/share-url`),
  downloadPdf: async (id, receiptNumber) => {
    const response = await api.get(
      `/receipts/${id}/pdf`,
      { responseType: 'blob' }
    );
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url  = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href  = url;
    link.download = `Kwitansi-${(receiptNumber || id).replace(/\//g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  exportXlsx:     () => api.get('/receipts/export', { responseType: 'blob' }),
  downloadTemplate: () => api.get('/receipts/import-template', { responseType: 'blob' }),
  importXlsx:     (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/receipts/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const paymentCategoryApi = {
  list:   ()       => api.get('/payment-categories'),
  update: (data)   => api.put('/payment-categories', data),
};

export const bankAccountApi = {
  list:   ()       => api.get('/bank-accounts'),
  create: (data)   => api.post('/bank-accounts', data),
  update: (id, data) => api.put(`/bank-accounts/${id}`, data),
  remove: (id)     => api.delete(`/bank-accounts/${id}`),
};

export default api;
