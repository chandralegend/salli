import type { ReactNode } from "react";
import { clsx } from "clsx";
import { Reveal } from "@/components/Reveal";

export function FeatureDeepDive({
  reverse,
  title,
  body,
  visual,
  extra,
}: {
  reverse?: boolean;
  title: ReactNode;
  body: string;
  visual: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <Reveal className={clsx("grid items-center gap-15 md:grid-cols-2", reverse && "md:[&>*:first-child]:order-2")}>
      <div className={clsx(reverse ? "md:col-start-2" : "")}>
        <h3 className="font-display text-[clamp(32px,4vw,50px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          {title}
        </h3>
        <p className="mt-4.5 max-w-[400px] text-[17px] leading-[1.55] text-ink-60">{body}</p>
        {extra}
      </div>
      <div className={clsx(reverse ? "md:col-start-1 md:row-start-1" : "")}>{visual}</div>
    </Reveal>
  );
}
