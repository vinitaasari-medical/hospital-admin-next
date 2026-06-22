/**
 * <AppAvatar /> — avatar with automatic initials fallback.
 */
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface AppAvatarProps {
  src?: string;
  name?: string;
  initials?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
  xl: "h-14 w-14 text-base",
};

function getInitials(name?: string) {
  if (!name) return "";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppAvatar({ src, name, initials, size = "md", className }: AppAvatarProps) {
  const fallback = initials || getInitials(name);
  return (
    <Avatar className={cn(sizeMap[size], className)}>
      {src && <AvatarImage src={src} alt={name || "avatar"} />}
      <AvatarFallback className="bg-secondary/15 text-secondary font-semibold">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}
