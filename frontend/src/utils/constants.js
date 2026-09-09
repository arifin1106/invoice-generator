export const LEVELS = ['P1', 'P2', 'K1', 'K2', 'Primary'];

export const BANK_CATEGORIES = [
  { value: 'preschool', label: 'Preschool & Kindergarten' },
  { value: 'primary',   label: 'Primary' },
  { value: 'umum',      label: 'Umum' },
];

export function levelToCategory(level) {
  return ['P1', 'P2', 'K1', 'K2'].includes(level) ? 'preschool' : 'primary';
}
