import { cn } from "@/lib/utils";

/**
 * The Salli brand mark. The PNG already carries the dark ledger-cover background,
 * rounded corners, and the cream glyph — so it's dropped in directly, only sized
 * and (optionally) re-rounded via className.
 */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/salli-logo.png"
      alt="Salli"
      width={256}
      height={256}
      draggable={false}
      className={cn("rounded-lg object-cover select-none shrink-0", className)}
    />
  );
}
