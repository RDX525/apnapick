"use client";

import { useEffect } from "react";

export function Atmosphere() {
  useEffect(() => {
    const root = document.documentElement;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 769px)");
    let timer = 0;
    let armed = false;

    function onScroll() {
      if (!armed) {
        root.classList.add("is-scrolling");
        armed = true;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        root.classList.remove("is-scrolling");
        armed = false;
      }, 160);
    }

    function onVisibility() {
      root.classList.toggle("is-hidden", document.hidden);
    }

    function bind() {
      const enable = desktop.matches && !motion.matches;
      window.removeEventListener("scroll", onScroll);
      if (!enable) {
        root.classList.remove("is-scrolling");
        armed = false;
        return;
      }
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    bind();
    onVisibility();
    desktop.addEventListener("change", bind);
    motion.addEventListener("change", bind);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      desktop.removeEventListener("change", bind);
      motion.removeEventListener("change", bind);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
      root.classList.remove("is-scrolling");
      root.classList.remove("is-hidden");
    };
  }, []);

  return (
    <div className="ap-atmosphere" aria-hidden>
      <div className="ap-orb ap-orb-a" />
      <div className="ap-orb ap-orb-b" />
      <div className="ap-orb ap-orb-c" />
    </div>
  );
}
