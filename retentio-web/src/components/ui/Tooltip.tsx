"use client";

import { ReactNode, useState, useRef, useEffect } from "react";

export default function Tooltip({ children, content, delay = 200 }: { children: ReactNode; content: ReactNode; delay?: number }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  function handleEnter() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(true), delay);
  }
  function handleLeave() {
    if (timer.current) window.clearTimeout(timer.current);
    setVisible(false);
  }

  return (
    <span className="relative inline-block" onMouseEnter={handleEnter} onFocus={handleEnter} onMouseLeave={handleLeave} onBlur={handleLeave} tabIndex={0}>
      {children}
      <span
        role="tooltip"
        aria-hidden={!visible}
        className={`pointer-events-none z-50 absolute left-1/2 -translate-x-1/2 mt-2 w-max max-w-xs rounded-md bg-black text-white text-xs leading-snug px-2 py-1 opacity-0 transform transition-all duration-150 ${visible ? "opacity-100 translate-y-0" : "translate-y-1"}`}
        style={{ top: '100%' }}
      >
        {content}
      </span>
    </span>
  );
}
