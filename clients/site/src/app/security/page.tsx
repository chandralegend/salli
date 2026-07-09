import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Security — Salli",
  description: "How Salli protects your financial data.",
};

export default function SecurityPage() {
  return (
    <LegalLayout title="Security" updated="9 July 2026">
      <p>
        Salli handles real financial data, so security isn&apos;t an afterthought — it&apos;s part of how
        the product is designed. This page describes the main protections in place today.
      </p>

      <h2>1. Deterministic money, not AI guesswork</h2>
      <p>
        The single biggest risk in an &ldquo;AI finance app&rdquo; is a language model quietly getting
        arithmetic wrong. Salli is built so that never happens: every number you see — tax
        payable, net worth, FIRE score — comes from a deterministic rules engine, never from the
        AI. The assistant can read and explain your ledger, but it cannot compute or alter a
        monetary figure. Any action it proposes that would write to your ledger requires your
        explicit approval first.
      </p>

      <h2>2. Encryption</h2>
      <p>
        All traffic between your browser, our servers, and our infrastructure providers is
        encrypted in transit using TLS. Data at rest — your ledger, account details, and uploaded
        documents — is encrypted at rest by our infrastructure providers.
      </p>

      <h2>3. Authentication</h2>
      <p>
        Accounts are authenticated using signed, verifiable tokens (JWTs) issued by our
        authentication provider, including support for Google and Apple sign-in. Sessions are
        verified on every request; we don&apos;t roll our own password-storage or session logic.
      </p>

      <h2>4. Data isolation</h2>
      <p>
        Your ledger, documents, and account data are scoped to your account. Database access
        policies enforce that a request can only read or write data belonging to the
        authenticated user making it.
      </p>

      <h2>5. Infrastructure</h2>
      <p>
        Salli runs on established, managed infrastructure providers for our database,
        authentication, storage, application hosting, and web hosting — rather than
        self-managed servers. This means security patching, network protection, and physical
        security are handled by providers whose core business is operating that infrastructure
        securely.
      </p>

      <h2>6. Payments</h2>
      <p>
        We never see or store your card details. Paid subscriptions are handled by a licensed
        payment processor acting as merchant of record, who manages payment data under their own
        compliance obligations (including PCI-DSS for card processing).
      </p>

      <h2>7. Application security practices</h2>
      <ul>
        <li>Dependencies are kept up to date and monitored for known vulnerabilities;</li>
        <li>Infrastructure changes go through automated, auditable deployment pipelines rather than manual production access;</li>
        <li>Secrets and credentials are stored in dedicated secret management, never in source code.</li>
      </ul>

      <h2>8. Reporting a security issue</h2>
      <p>
        If you believe you&apos;ve found a security vulnerability in Salli, please tell us before
        disclosing it publicly. Email{" "}
        <a href="mailto:hello@salli.lk">hello@salli.lk</a> with the subject line &ldquo;Security&rdquo; and as
        much detail as you can share. We take reports seriously and will respond promptly.
      </p>

      <h2>9. Sub-processors</h2>
      <p>
        For a list of the infrastructure and service providers we rely on to run Salli, see our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </LegalLayout>
  );
}
