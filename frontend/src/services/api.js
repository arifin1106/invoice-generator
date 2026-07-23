import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || 'Terjadi kesalahan. Coba lagi.';
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
  pdfUrl:         (id)     => `http://localhost:8000/api/invoices/${id}/pdf`,
  downloadPdf: async (id, invoiceNumber) => {
    const response = await axios.get(
      `http://localhost:8000/api/invoices/${id}/pdf`,
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
};

export const settingApi = {
  show:   ()     => api.get('/settings'),
  update: (data) => api.post('/settings', data),
};

export default api;
