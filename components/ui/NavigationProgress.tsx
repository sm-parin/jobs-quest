'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track previous URL to detect changes
  const prevUrl = useRef<string>(`${pathname}?${searchParams}`);

  useEffect(() => {
    const currentUrl = `${pathname}?${searchParams}`;
    if (currentUrl === prevUrl.current) return;
    prevUrl.current = currentUrl;

    // Navigation started — show bar at 70%
    setVisible(true);
    setProgress(70);

    // After 100ms jump to 90%
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setProgress(90), 100);

    // Complete and hide
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    completeTimerRef.current = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [pathname, searchParams]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-[3px]"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="h-full bg-brand-500"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? 'none' : 'width 200ms ease',
          opacity: visible ? 1 : 0,
          transitionProperty: 'width, opacity',
        }}
      />
    </div>
  );
}
