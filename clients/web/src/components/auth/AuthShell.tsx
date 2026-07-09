import { BubbleBackground } from "@/components/ui/bubble-background";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <BubbleBackground
      className="min-h-screen bg-[#0C0C0A] flex items-center justify-center p-6"
      interactive
      colors={{
        first:  "232,252,133",
        second: "165,255,185",
        third:  "0,180,150",
        fourth: "100,220,160",
        fifth:  "200,240,100",
        sixth:  "130,210,190",
      }}
    >
      {/* Auth card */}
      <div
        className="w-full max-w-[400px] bg-card rounded-3xl p-10 relative z-10"
        style={{ animation: "fadeUp 0.3s ease" }}
      >
        {/* Logo */}
        <span className="text-[26px] font-black tracking-[-0.07em] mb-8 block">
          <span className="text-[#E8FC85]">s</span>
          <span className="text-foreground">alli</span>
        </span>

        <h1 className="text-[26px] font-extrabold tracking-[-0.04em] leading-tight mb-1.5">
          {title}
        </h1>
        <p className="text-[14px] text-muted-foreground mb-8">{subtitle}</p>

        {children}
      </div>
    </BubbleBackground>
  );
}

/** Brand mark buttons for OAuth. */
export function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.62c-.02-2.06 1.68-3.05 1.76-3.1-.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.75-3.12.75-.64 0-1.64-.73-2.7-.71-1.39.02-2.67.81-3.38 2.05-1.44 2.5-.37 6.2 1.04 8.23.69.99 1.51 2.1 2.58 2.06 1.04-.04 1.43-.67 2.69-.67 1.25 0 1.61.67 2.7.65 1.12-.02 1.82-1 2.5-2 .79-1.15 1.11-2.26 1.13-2.32-.02-.01-2.17-.83-2.19-3.3M14.4 6.32c.56-.69.94-1.64.84-2.59-.81.03-1.8.54-2.38 1.22-.52.6-.98 1.57-.86 2.5.9.07 1.83-.46 2.4-1.13" />
    </svg>
  );
}
