'use client';
import { useScope } from "@/hooks/use-scope";
import { AppBreadcrumb, type BreadcrumbItemDef } from "@/components/common/breadcrumb/AppBreadcrumb";

interface ScopeBreadcrumbsProps {
  page?: string;
  className?: string;
}

const ScopeBreadcrumbs = ({ page, className }: ScopeBreadcrumbsProps) => {
  const { chain } = useScope();
  const items: BreadcrumbItemDef[] = chain.map((s, idx) => ({
    label: s.name,
    href: idx === chain.length - 1 && !page ? undefined : s.overviewPath,
  }));
  if (page) items.push({ label: page });
  return <AppBreadcrumb items={items} className={className} />;
};

export default ScopeBreadcrumbs;
