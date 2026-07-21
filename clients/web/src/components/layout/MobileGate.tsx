import { Monitor } from "lucide-react";

/**
 * Full-screen notice shown on small viewports only (`md:hidden`, pure CSS —
 * no JS, no hydration flash). The Salli web app targets desktop/laptop; on a
 * phone we point people at the native mobile app or a bigger screen instead of
 * shipping a cramped responsive layout. Rendered in the root layout so it
 * covers every route (login, onboarding, and the app).
 */
export function MobileGate() {
  return (
    <div className="md:hidden fixed inset-0 z-[100] bg-background">
      {/* Center within the dynamic viewport (dvh) so the mobile address bar
          doesn't push the content below the visible middle. */}
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-5 px-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Monitor className="size-6" strokeWidth={2} />
        </span>
        <h1 className="text-lg font-semibold">Best on a bigger screen</h1>
        <p className="max-w-[15rem] text-sm text-muted-foreground">
          Open Salli on a desktop or laptop, or use the mobile app.
        </p>
      </div>
    </div>
  );
}
