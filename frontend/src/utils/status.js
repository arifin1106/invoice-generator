// Logika status item YANG SAMA dipakai di: form (edit/buat), preview A4, preview mobile.
// Harus identik dengan perhitungan backend: config/dompdf + hook saving Invoice.
export const round2 = (n) => Math.round((parseFloat(n) || 0) * 100) / 100;

export const computeItemStatus = (item = {}) => {
  const amount = parseFloat(item.amount) || 0;
  let discount = 0;
  if (item.discount_type === 'percentage') {
    discount = amount * ((parseFloat(item.discount_value) || 0) / 100);
  } else if (item.discount_type === 'fixed') {
    discount = Math.min(parseFloat(item.discount_value) || 0, amount);
  }
  const finalAmount = round2(amount - discount);
  const paid = round2(
    (Array.isArray(item.payments) ? item.payments : []).reduce(
      (s, p) => s + (parseFloat(p.amount) || 0),
      0
    )
  );

  if (paid <= 0) return 'Belum Lunas';
  if (paid >= finalAmount) return 'Lunas';
  return 'Sebagian';
};

export const statusBadgeCls = {
  'Lunas': 'badge-paid',
  'Sebagian': 'badge-partial',
  'Belum Lunas': 'badge-unpaid',
};