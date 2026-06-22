/**
 * <AppBadge /> — re-exports shadcn Badge with extended tone variants.
 * Use <StatusBadge /> for status pills; use <AppBadge /> for category/tag labels.
 */
import * as React from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";

export interface AppBadgeProps extends BadgeProps {}

export function AppBadge(props: AppBadgeProps) {
  return <Badge {...props} />;
}
