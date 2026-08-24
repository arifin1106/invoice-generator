const toDigits = (value) => {
  if (value === '' || value == null) return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n)) : '';
};

/**
 * Input harga dengan pemisah ribuan otomatis (id-ID).
 * State menyimpan digit murni ("500000"), tampilan berformat ("500.000").
 */
export default function CurrencyInput({ value, onValueChange, ...rest }) {
  const digits = toDigits(value);
  const display = digits === '' ? '' : Number(digits).toLocaleString('id-ID');

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      {...rest}
      value={display}
      onChange={(e) => onValueChange(e.target.value.replace(/\D/g, '').slice(0, 15))}
    />
  );
}
