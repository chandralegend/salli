"use client";

import * as React from "react";
import { usePageHeader } from "@/lib/store";

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbTab,
  breadcrumbTabHref,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbTab?: string;
  breadcrumbTabHref?: string;
}) {
  const setHeader = usePageHeader((s) => s.setHeader);

  // No dependency array: registers into the shell's sticky header on every
  // render, so the store always mirrors this render's props with no risk of
  // a stale closure from an incomplete deps list. `setHeader` is a stable
  // zustand action, so this can't loop.
  React.useEffect(() => {
    setHeader({ title, subtitle, actions, breadcrumbTab: breadcrumbTab ?? null, breadcrumbTabHref: breadcrumbTabHref ?? null });
  });

  return null;
}
