import api from '../services/api';

const fetchPdfBlob = async (endpoint) => {
  const response = await api.get(endpoint, { responseType: 'blob' });
  return new Blob([response.data], { type: 'application/pdf' });
};

export const downloadBlob = (blob, filename) => {
  const url  = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href  = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Kirim file PDF langsung via Web Share API (share sheet OS → pilih WhatsApp).
 * Fallback bila browser tidak mendukung: unduh PDF + buka wa.me dengan pesan.
 * @returns {{shared: boolean, cancelled?: boolean, fallback?: boolean}}
 */
export const sharePdfViaWhatsApp = async ({ endpoint, filename, text }) => {
  const blob = await fetchPdfBlob(endpoint);
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return { shared: true };
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { shared: false, cancelled: true };
      }
      // Gagal share file → lanjut ke fallback unduh
    }
  }

  await downloadBlob(blob, filename);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  return { shared: false, fallback: true };
};
