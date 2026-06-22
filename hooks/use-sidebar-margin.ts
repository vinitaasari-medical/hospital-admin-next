'use client';
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse";

export const useSidebarMargin = () => {
  const { collapsed } = useSidebarCollapse();
  return collapsed ? "lg:ml-16" : "lg:ml-64";
};
