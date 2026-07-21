/**
 * Format angka ke format Rupiah
 */
export const formatRupiah = (value) => {
  const num = parseFloat(value) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export const parseRupiah = (value) => {
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(/[^0-9]/g, '')) || 0;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  // Parse safely to avoid UTC timezone shift on YYYY-MM-DD strings
  let d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, day] = dateStr.split('-');
    d = new Date(+y, +m - 1, +day);
  } else {
    d = new Date(dateStr);
  }
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const toInputDate = (dateStr) => {
  if (!dateStr) return '';
  // If already in YYYY-MM-DD format, return as-is (avoids UTC timezone shift bug)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // For full ISO strings (with time), extract just the date part directly
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  return dateStr;
};

export const statusConfig = {
  paid:    { label: 'Lunas',       className: 'badge-paid' },
  partial: { label: 'Sebagian',    className: 'badge-partial' },
  unpaid:  { label: 'Belum Lunas', className: 'badge-unpaid' },
};
