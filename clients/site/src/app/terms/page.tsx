import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Salli.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="9 July 2026">
      <p>
        These Terms of Service (&ldquo;<strong>Terms</strong>&rdquo;) govern your access to and use
        of Salli, the ledger, tax, and financial-independence product operated by Salli
        (&ldquo;<strong>Salli</strong>&rdquo;, &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>us</strong>&rdquo;). By creating an account or using the
        service, you agree to these Terms. If you don&apos;t agree, please don&apos;t use Salli.
      </p>

      <h2>1. What Salli is</h2>
      <p>
        Salli is a personal finance product for Sri Lankan taxpayers. It keeps a double-entry
        ledger of your finances, computes Sri Lanka income tax using a deterministic rules
        engine, scores your progress toward financial independence, and offers an AI assistant
        (&ldquo;Scrooge&rdquo;) that can answer questions about your own ledger data.
      </p>

      <h2>2. Not tax or financial advice</h2>
      <p>
        Salli is a planning and record-keeping tool, not a registered tax agent, accountant, or
        licensed financial adviser. Tax figures are computed by a deterministic engine against
        published Inland Revenue Department (IRD) rules for the relevant assessment year, but
        they are <strong>estimates for planning purposes only</strong>. Before filing a return, making an
        investment decision, or relying on any figure Salli produces, you should verify it with a
        registered tax agent or licensed financial adviser. We are not responsible for penalties,
        interest, or losses arising from reliance on Salli&apos;s output.
      </p>

      <h2>3. Your account</h2>
      <p>
        You must provide accurate information when creating an account and keep your login
        credentials secure. You&apos;re responsible for activity that happens under your account.
        Tell us promptly if you suspect unauthorised access.
      </p>

      <h2>4. Your data and content</h2>
      <p>
        You retain ownership of the financial data, documents, and information you add to Salli
        (&ldquo;<strong>your data</strong>&rdquo;). You grant us a limited licence to store, process, and display
        your data solely to provide and improve the service. We don&apos;t sell your data, and we
        don&apos;t use it to train third-party AI models. See our <a href="/privacy">Privacy Policy</a>{" "}
        for details on how your data is handled.
      </p>

      <h2>5. The AI assistant</h2>
      <p>
        Scrooge is an AI agent built on third-party large language models. It can read and
        summarise your ledger data and answer questions, but it does not perform the arithmetic
        that produces your tax, net-worth, or FIRE figures: those numbers always come from
        Salli&apos;s deterministic engine. Treat the assistant&apos;s explanations as guidance, not
        instructions to act on without your own judgement. Any action the assistant proposes that
        would write to your ledger requires your explicit approval before it happens.
      </p>

      <h2>6. Subscriptions and billing</h2>
      <p>
        Salli offers a free plan and a paid Pro plan, which differ in the number of AI credits
        included each month. Paid subscriptions are billed in advance on a recurring basis through
        our payment processor and merchant of record, and are subject to that processor&apos;s
        payment terms. You can cancel at any time from your account settings; cancellation takes
        effect at the end of the current billing period. Fees are non-refundable except where
        required by law.
      </p>
      <p>
        Credit top-ups are one-time purchases rather than subscriptions. Purchased credits do not
        expire, are drawn on only after each month&apos;s included allowance is used, and are
        non-refundable once the associated AI usage has taken place.
      </p>

      <h2>7. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use Salli for any unlawful purpose, or to input data you don&apos;t have the right to use;</li>
        <li>Attempt to reverse-engineer, scrape, or overload the service;</li>
        <li>Share your account with others or resell access to Salli;</li>
        <li>Use the service to process another person&apos;s financial data without their consent.</li>
      </ul>

      <h2>8. Third-party services</h2>
      <p>
        Salli is built on infrastructure and services operated by third parties, including
        database and authentication hosting, application hosting, and a payment processor. Your
        use of Salli is also subject to the availability of these providers. We select providers
        carefully but can&apos;t guarantee uninterrupted service.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may close your account at any time. We may suspend or terminate accounts that violate
        these Terms, present a security risk, or where required by law. On termination, your data
        is deleted or anonymised in line with our <a href="/privacy">Privacy Policy</a>, except
        where we&apos;re required to retain records for legal or regulatory reasons.
      </p>

      <h2>10. Disclaimers and limitation of liability</h2>
      <p>
        Salli is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied. To the
        maximum extent permitted by law, we are not liable for indirect, incidental, or
        consequential damages, or for any tax penalty, financial loss, or missed filing deadline
        arising from your use of the service. Nothing in these Terms limits liability that
        cannot be limited under applicable law.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of Sri Lanka. Any dispute arising from these Terms
        or your use of Salli will be subject to the exclusive jurisdiction of the courts of Sri
        Lanka.
      </p>

      <h2>12. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. If we make material changes, we&apos;ll notify
        you by email or an in-app notice before they take effect. Continued use of Salli after a
        change takes effect means you accept the updated Terms.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these Terms? Reach us at{" "}
        <a href="mailto:hello@salli.lk">hello@salli.lk</a>.
      </p>
    </LegalLayout>
  );
}
