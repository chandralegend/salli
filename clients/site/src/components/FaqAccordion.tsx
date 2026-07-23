export type Faq = { q: string; a: string };

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  return (
    <div>
      {faqs.map((item) => (
        <details key={item.q} className="faq border-t-2 border-ink">
          <summary className="flex items-center justify-between gap-4 py-6 px-1">
            <span className="font-display text-[clamp(18px,2vw,23px)] font-bold tracking-[-0.01em]">
              {item.q}
            </span>
            <span className="faqicon flex-none font-mono text-[28px] leading-none text-red">+</span>
          </summary>
          <div className="faqa max-w-[680px] px-1 pb-7 text-[15.5px] leading-[1.65] text-ink-60">
            {item.a}
          </div>
        </details>
      ))}
      <div className="border-t-2 border-ink" />
    </div>
  );
}
