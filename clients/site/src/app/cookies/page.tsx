import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Salli uses cookies and local storage.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" updated="9 July 2026">
      <p>
        Cookies are small pieces of data a website stores in your browser. Salli keeps its use of
        cookies deliberately minimal, and we don&apos;t run third-party advertising trackers.
      </p>

      <h2>1. Strictly necessary</h2>
      <p>
        Used to keep you signed in and to protect your account (authentication tokens, session
        state, and CSRF protection). Salli won&apos;t function without these: they can&apos;t be turned
        off, though you can clear them at any time by signing out or clearing your browser
        storage.
      </p>

      <h2>2. Preferences</h2>
      <p>
        Used to remember choices you&apos;ve made, such as light/dark mode or panel sizing, so you
        don&apos;t have to reset them every visit. Stored in your browser&apos;s local storage rather than
        a traditional cookie in most cases, but covered by this policy either way.
      </p>

      <h2>3. Analytics</h2>
      <p>
        We may use privacy-respecting, aggregate analytics to understand how the product is used
        and where it breaks, for example page views or error rates. We do not use this data to
        build advertising profiles, and we don&apos;t share it with ad networks.
      </p>

      <h2>4. Third-party cookies</h2>
      <p>
        Signing in with Google or Apple involves cookies set by those providers as part of their
        sign-in flow. Those are governed by Google&apos;s and Apple&apos;s own privacy policies, not this
        one.
      </p>

      <h2>5. Managing cookies</h2>
      <p>
        You can control or delete cookies through your browser settings. Blocking strictly
        necessary cookies will prevent you from signing in. If we introduce optional analytics
        cookies in the future, the cookie banner on this site lets you opt out of them.
      </p>

      <h2>6. Changes to this policy</h2>
      <p>
        If the cookies we use change materially, we&apos;ll update this page and, where appropriate,
        ask for your consent again.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions? Email <a href="mailto:hello@leafmonkey.org">hello@leafmonkey.org</a>.
      </p>
    </LegalLayout>
  );
}
