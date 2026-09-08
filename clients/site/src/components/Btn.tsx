import { clsx } from "clsx";
import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * The site's only button.
 *
 * It replaces `Btn`, which pulled toward the cursor. Magnetic hover
 * belongs to a soft, floating design language; this one is flat and physical,
 * so the interaction is a press instead: the button travels into its own hard
 * shadow and the shadow goes to zero. The shadow stops being decoration and
 * becomes the distance the thing can be pushed.
 *
 * Variants exist to keep colour meaning intact rather than to offer choice.
 * Orange is state and lavender is AI, exactly as in the app, so `ai` is for
 * "Ask Salli" and nothing else. Every combination below clears WCAG AA: cream
 * on orange does not, which is why the accent button takes ink text.
 */
const VARIANTS = {
  primary: "bg-ink text-cream",
  accent: "bg-red text-ink",
  ai: "bg-ai text-ink",
  ghost: "bg-card text-ink",
} as const;

const SIZES = {
  sm: "px-4 py-2.5 text-[14px]",
  md: "px-5.5 py-3 text-[15px]",
  lg: "px-7 py-4 text-[17px]",
} as const;

export function Btn({
  children,
  className,
  variant = "primary",
  size = "md",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={clsx(
        // `whitespace-nowrap`: a wrapped CTA label reads as a broken button,
        // and these labels are short enough that wrapping is always a bug.
        "brut press inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}
