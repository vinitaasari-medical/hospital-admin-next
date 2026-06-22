'use client';
import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
});

export const useSidebarCollapse = () => useContext(SidebarContext);

export const SidebarCollapseProvider = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = () => setCollapsed((p) => !p);
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
};
