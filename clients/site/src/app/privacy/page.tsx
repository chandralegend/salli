import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Salli collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="27 July 2026">
      <p>
        This Privacy Policy explains what information Salli collects, why we collect it, and how
        it&apos;s used and protected. Salli handles financial data, so we&apos;ve tried to write this
        plainly rather than burying it in boilerplate.
      </p>

      <h2>1. Information we collect</h2>
      <p>We collect information in four ways:</p>
      <ul>
        <li>
          <strong>Account information</strong>: your name, email address, and authentication
          details when you sign up (directly, or via Google/Apple sign-in).
        </li>
        <li>
          <strong>Financial data you provide</strong>: ledger entries, account balances, income
          and expense records, goals, and any bank statements or documents you upload for
          parsing.
        </li>
        <li>
          <strong>Usage data</strong>: how you interact with the product (pages visited, features
          used, AI messages sent), collected to operate and improve the service.
        </li>
        <li>
          <strong>Bug reports and diagnostics you choose to send us</strong>: when you report a
          problem, we receive your description of it along with a technical snapshot — the page you
          were on, your browser, device and locale details, recent failed requests and any error
          message behind them, and any screenshot you attach. This snapshot deliberately excludes
          your balances, amounts, account names and entry descriptions, and you can review exactly
          what it contains before you send it.
        </li>
      </ul>

      <h2>2. How we use your information</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Provide the ledger, tax computation, FIRE scoring, and AI assistant features;</li>
        <li>Authenticate you and keep your account secure;</li>
        <li>Process payments for paid subscription plans;</li>
        <li>Send service-related communications (billing, security alerts, product updates);</li>
        <li>Diagnose issues and improve the reliability and quality of the product.</li>
      </ul>
      <p>
        We do not sell your personal or financial data, and we do not use your financial data to
        train third-party AI models.
      </p>

      <h2>3. How the AI assistant handles your data</h2>
      <p>
        When you ask Scrooge a question, relevant parts of your ledger data are sent to our AI
        provider to generate a response. This is used only to answer your query within your
        session; it is not used to train the underlying model. All monetary figures shown to you
        are computed by Salli&apos;s own deterministic engine beforehand; the AI explains and
        contextualises numbers, it does not calculate them.
      </p>

      <h2>4. Where your data is stored</h2>
      <p>
        Your data is stored in a managed Postgres database with row-level access controls, hosted
        in the Asia-Pacific region for lower latency from Sri Lanka. Uploaded documents (such as
        bank statements) are stored in a private object storage bucket that only your
        authenticated account can access. Data in transit is encrypted with TLS; our
        infrastructure providers encrypt data at rest.
      </p>

      <h2>5. Sub-processors</h2>
      <p>We rely on a small number of vetted infrastructure and service providers to run Salli:</p>
      <ul>
        <li><strong>Database, authentication &amp; storage</strong>: for the ledger database, login, and document storage.</li>
        <li><strong>Application hosting</strong>: for running the API and web application.</li>
        <li><strong>AI provider</strong>: to power the Scrooge assistant.</li>
        <li><strong>Payment processor</strong>: to handle paid subscriptions as merchant of record.</li>
        <li><strong>Issue tracking</strong>: to record and resolve bugs you report to us.</li>
      </ul>
      <p>
        Each of these providers processes data only as needed to deliver their part of the
        service, under their own security and privacy commitments.
      </p>

      <h2>6. Data retention</h2>
      <p>
        We keep your data for as long as your account is active. If you close your account, we
        delete your personal and financial data within a reasonable period, except where we&apos;re
        legally required to retain certain records (for example, billing records for tax
        purposes).
      </p>
      <p>
        Bug reports are treated differently, and we want to be explicit about it. When you report a
        problem, we create a corresponding ticket in our issue tracker so the bug can actually get
        fixed. That ticket is a record about the product rather than about you: it carries a
        pseudonymous account identifier, never your name or email address. Because other people are
        usually affected by the same bug, these tickets and their diagnostics are kept for
        engineering purposes even after an account is closed — while the copy of the report held
        inside Salli, including your email address if you asked us to follow up, is deleted with the
        rest of your data.
      </p>

      <h2>7. Your rights</h2>
      <p>You can, at any time:</p>
      <ul>
        <li>Access and export the data you&apos;ve stored in Salli;</li>
        <li>Correct inaccurate information in your account;</li>
        <li>Request deletion of your account and associated data;</li>
        <li>Withdraw consent for optional communications.</li>
      </ul>
      <p>
        To exercise any of these, email <a href="mailto:hello@salli.lk">hello@salli.lk</a>.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Salli uses a small number of cookies and local-storage entries needed to keep you signed
        in and remember preferences (like light/dark mode). See our{" "}
        <a href="/cookies">Cookie Policy</a> for details.
      </p>

      <h2>9. Children&apos;s privacy</h2>
      <p>
        Salli is intended for adults managing their own finances and is not directed at children
        under 18. We don&apos;t knowingly collect data from children.
      </p>

      <h2>10. International transfers</h2>
      <p>
        Some of our sub-processors operate infrastructure outside Sri Lanka. Where data crosses
        borders, we rely on providers that maintain appropriate safeguards for that transfer.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this policy as the product evolves. Material changes will be communicated
        by email or an in-app notice before they take effect.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about this policy or your data? Email{" "}
        <a href="mailto:hello@salli.lk">hello@salli.lk</a>.
      </p>
    </LegalLayout>
  );
}
