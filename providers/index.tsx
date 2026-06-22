'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ScopeProvider } from "@/hooks/use-scope";
import { SidebarCollapseProvider } from "@/hooks/use-sidebar-collapse";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ScopeProvider>
            <SidebarCollapseProvider>
              {children}
            </SidebarCollapseProvider>
          </ScopeProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
