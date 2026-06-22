/**
 * <AppTabs /> — declarative wrapper around shadcn Tabs.
 */
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface AppTabItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  disabled?: boolean;
  badge?: React.ReactNode;
}

export interface AppTabsProps {
  items: AppTabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  listClassName?: string;
}

export function AppTabs({
  items,
  value,
  defaultValue,
  onValueChange,
  className,
  listClassName,
}: AppTabsProps) {
  return (
    <Tabs
      value={value}
      defaultValue={defaultValue ?? items[0]?.value}
      onValueChange={onValueChange}
      className={className}
    >
      <TabsList className={cn(listClassName)}>
        {items.map((it) => (
          <TabsTrigger key={it.value} value={it.value} disabled={it.disabled} className="gap-2">
            {it.icon && <it.icon className="h-4 w-4" />}
            {it.label}
            {it.badge}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((it) => (
        <TabsContent key={it.value} value={it.value}>
          {it.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
