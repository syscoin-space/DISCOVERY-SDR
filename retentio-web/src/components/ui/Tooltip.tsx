"use client";

import { ReactNode, useState, useRef, useEffect } from "react";

type Position = "top" | "right" | "left" | "bottom";

export default function Tooltip({
  children,
  content,
  delay = 200,
  position = "top",
}: {
  children: ReactNode;
  content: ReactNode;
  delay?: number;
  position?: Position;
}) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function handleEnter() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(true), delay);
  }
  function handleLeave() {
    if (timer.current) window.clearTimeout(timer.current);
    setVisible(false);
  }

  // Position classes (Tailwind helpers) — supports dark mode via `dark:` classes
  let posClass = "left-1/2 -translate-x-1/2 top-full mt-2"; // bottom by default
  if (position === "top") posClass = "left-1/2 -translate-x-1/2 bottom-full mb-2";
  if (position === "right") posClass = "top-1/2 -translate-y-1/2 left-full ml-2";
  if (position === "left") posClass = "top-1/2 -translate-y-1/2 right-full mr-2";

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleEnter}
      onFocus={handleEnter}
      onMouseLeave={handleLeave}
      onBlur={handleLeave}
      tabIndex={0}
    >
      {children}
      <span
        role="tooltip"
        aria-hidden={!visible}
        className={`pointer-events-none z-50 absolute ${posClass} w-max max-w-xs rounded-md px-2 py-1 text-xs leading-snug transition-all duration-150 transform ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"} shadow-lg bg-black text-white dark:bg-white dark:text-black`}
      >
        {content}
      </span>
    </span>
  );
}
