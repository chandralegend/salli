import type { ReactNode } from "react";

/** The rotated red box behind a headline word, cream text on top. */
export function Highlight({ children }: { children: ReactNode }) {
  return (
    <span className="relative whitespace-nowrap">
      <span className="relative z-10 px-[0.08em] text-cream">{children}</span>
      <span
        className="absolute inset-x-0 top-[8%] bottom-[8%] z-0 rounded-md bg-red"
        style={{ transform: "rotate(-1.4deg)" }}
        aria-hidden="true"
      />
    </span>
  );
}
