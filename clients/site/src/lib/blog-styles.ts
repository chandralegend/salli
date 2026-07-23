// Client-safe constants split out of posts.ts, which pulls in the Node-only
// Keystatic reader — importing that from a client component drags
// node:fs/promises into the browser bundle and fails the build.
export type CoverStyle = "ink" | "red-gradient" | "green" | "ink-gradient";

export const COVER_STYLE_CLASS: Record<CoverStyle, string> = {
  ink: "bg-ink",
  "red-gradient": "bg-linear-to-br from-red to-red-deep",
  green: "bg-[#0e3b2a]",
  "ink-gradient": "bg-linear-to-br from-ink-soft to-ink",
};
