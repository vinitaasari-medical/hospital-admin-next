/**
 * <AppBreadcrumb /> — controlled breadcrumb built on shadcn primitives.
 */
import * as React from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbItemDef {
  label: string;
  href?: string;
}

export interface AppBreadcrumbProps {
  items: BreadcrumbItemDef[];
  className?: string;
}

export function AppBreadcrumb({ items, className }: AppBreadcrumbProps) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <React.Fragment key={`${it.label}-${i}`}>
              <BreadcrumbItem>
                {last || !it.href ? (
                  <BreadcrumbPage>{it.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={it.href}>{it.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
