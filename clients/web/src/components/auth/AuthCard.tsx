/**
 * Shared frame for all auth screens: wordmark, one centered 400px card,
 * a footer line. Identical geometry across variants so switching feels stable.
 */
export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center bg-background px-4">
      <p className="font-heading text-2xl font-extrabold tracking-tight mt-12 mb-10">
        Salli<span className="text-primary">.</span>
      </p>
      <div className="w-full max-w-[400px] rounded-lg border bg-card p-8">
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted-foreground mt-1">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-4 text-[13px] text-muted-foreground">{footer}</div>}
    </main>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81"
      />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.393 2.033-1.18 2.68-.79.646-1.7.998-2.73.912-.13-1.09.36-2.11 1.14-2.79.79-.68 1.83-1.13 2.77-1.28v.478zm3.42 17.44c-.53 1.21-1.14 2.4-2.05 3.53-.9 1.12-1.98 2.25-3.36 2.28-1.35.02-1.78-.79-3.31-.79-1.53 0-2 .77-3.28.81-1.32.05-2.53-1.2-3.45-2.32-1.86-2.3-3.34-6.5-1.4-9.35 1.08-1.6 2.85-2.6 4.7-2.63 1.35-.03 2.62.9 3.44.9.82 0 2.37-1.11 4-.95.68.03 2.6.28 3.83 2.08-3.13 1.72-2.65 6.05.18 6.44z"
      />
    </svg>
  );
}
