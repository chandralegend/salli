"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getRouteLabel } from "@/lib/nav";
import { usePageHeader } from "@/lib/store";
import { APP_CONTAINER_CLASS } from "./appContainer";

export function AppHeader() {
  const pathname = usePathname();
  const { title, subtitle, actions, breadcrumbTab, breadcrumbTabHref, clear } = usePageHeader();

  // AppHeader is part of the persistent shell (rendered before {children} in
  // AppShell, never unmounts across navigation) — clearing here on every
  // pathname change means this effect always commits before the new page's
  // own PageHeader effect, so a stale title/tab never lingers into the next
  // route.
  React.useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (pathname === "/agent") return null; // redirect stub — never show a header

  const isDashboard = pathname.startsWith("/dashboard");
  // Dashboard is both the "home" crumb and its own route label — showing
  // both would read as "Dashboard / Dashboard", so the 2nd crumb is only
  // ever the route label for every OTHER page.
  const pageLabel = isDashboard ? null : getRouteLabel(pathname);

  return (
    <div className="sticky top-0 z-20 border-b bg-background shadow-sm">
      <div className={APP_CONTAINER_CLASS}>
        <div className="flex h-12 items-center gap-3">
          <SidebarTrigger className="-ml-1.5" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {isDashboard ? (
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href="/dashboard" />}>Dashboard</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {pageLabel && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {breadcrumbTab ? (
                      <BreadcrumbLink render={<Link href={breadcrumbTabHref ?? pathname} />}>
                        {pageLabel}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </>
              )}
              {breadcrumbTab && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{breadcrumbTab}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
          <div>
            <h1 id="tour-page-title" className="text-3xl font-bold tracking-tight">{title || " "}</h1>
            {subtitle && <p className="text-[13px] text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
