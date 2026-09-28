import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Dropdown kustom (pengganti <select> native) dengan panel yang lembut.
 * Pola ARIA: select-only combobox + listbox. Fokus tetap di tombol pemicu,
 * opsi aktif ditunjuk lewat aria-activedescendant.
 *
 * Props:
 *  - value      : nilai terpilih ('' dianggap opsi "semua")
 *  - onChange   : (value) => void
 *  - options    : [{ value, label }]
 *  - label      : nama untuk pembaca layar, mis. "Filter status"
 *  - align      : 'left' | 'right' — sisi panel yang sejajar dengan tombol
 *  - emptyValue : nilai yang dianggap "tidak ada filter" (default '')
 */
export default function SelectMenu({
  value,
  onChange,
  options,
  label,
  align = 'left',
  emptyValue = '',
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const uid = useId();
  const listId = `${uid}-list`;

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];
  const isFiltered = value !== emptyValue;

  const openMenu = useCallback(() => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }, [selectedIndex]);

  const closeMenu = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const choose = (index) => {
    const opt = options[index];
    if (opt && opt.value !== value) onChange(opt.value);
    closeMenu(true);
  };

  // Tutup saat klik di luar komponen
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Jaga opsi aktif tetap terlihat saat navigasi keyboard
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.children[activeIndex]
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const onKeyDown = (e) => {
    const last = options.length - 1;

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, last));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(last);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu(true);
        break;
      case 'Tab':
        closeMenu(false);
        break;
      default:
        // Type-ahead: lompat ke opsi berawalan huruf yang diketik
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const ch = e.key.toLowerCase();
          const ordered = [
            ...options.slice(activeIndex + 1),
            ...options.slice(0, activeIndex + 1),
          ];
          const hit = ordered.find((o) => o.label.toLowerCase().startsWith(ch));
          if (hit) setActiveIndex(options.indexOf(hit));
        }
    }
  };

  return (
    <div className="select-menu" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`select-trigger ${isFiltered ? 'select-trigger--active' : ''}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${uid}-opt-${activeIndex}` : undefined}
        aria-label={`${label}: ${selected?.label ?? ''}`}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className="select-trigger-text">{selected?.label}</span>
        <ChevronDown size={16} className={`select-chevron ${open ? 'select-chevron--open' : ''}`} aria-hidden="true" />
      </button>

      <ul
        id={listId}
        ref={listRef}
        role="listbox"
        aria-label={label}
        data-open={open}
        className={`select-panel select-panel--${align}`}
        onMouseDown={(e) => e.preventDefault()} /* jaga fokus tetap di tombol */
      >
        {options.map((opt, i) => {
          const isSelected = opt.value === value;
          return (
            <li
              key={opt.value === '' ? '__all' : opt.value}
              id={`${uid}-opt-${i}`}
              role="option"
              aria-selected={isSelected}
              className={`select-option ${i === activeIndex ? 'select-option--active' : ''}`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => choose(i)}
            >
              <span>{opt.label}</span>
              {isSelected && <Check size={16} className="select-check" aria-hidden="true" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}