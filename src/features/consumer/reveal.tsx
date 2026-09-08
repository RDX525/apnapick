"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const started = performance.now();
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        if (performance.now() - started > 80) {
          el.classList.add("ap-reveal");
        }
        io.disconnect();
      },
      { rootMargin: "48px 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={
        delay
          ? ({ "--ap-reveal-delay": `${delay}s` } as CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
