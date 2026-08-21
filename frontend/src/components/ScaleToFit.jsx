import { useLayoutEffect, useRef, useState } from 'react';

const SHADOW_SPACE = 48;
const SIDE_MARGIN = 12;

/**
 * Membungkus lembar A4 agar di-scale otomatis mengikuti lebar kontainer.
 * Di layar lebar (> baseWidth), tampilan tidak berubah sama sekali.
 */
export default function ScaleToFit({ children, baseWidth = 794 }) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState('auto');

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return undefined;

    const update = () => {
      const available = Math.max(0, wrap.clientWidth - SIDE_MARGIN * 2);
      const next = Math.min(1, available / baseWidth);
      setScale(next);
      setHeight(inner.offsetHeight * next + SHADOW_SPACE);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [baseWidth]);

  return (
    <div
      ref={wrapRef}
      className="scale-fit"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div
        ref={innerRef}
        className="scale-fit-inner"
        style={{
          width: `${baseWidth}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
