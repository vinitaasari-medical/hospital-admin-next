'use client';
/**
 * Dynamic scope / organisation context.
 *
 * Replaces the previous static-SCOPES implementation with real data sourced
 * from localStorage (written at login) and the listclustersubnetworks API —
 * matching the network-switching logic in
 * hospital-admin/src/pages/MainDrawer/MainDrawer.jsx.
 *
 * Key behaviours carried over from the React app:
 *  - Cluster admins (is_cluster_admin=true) see the cluster scope plus one
 *    child scope per subnetwork.  The subnetwork list is fetched fresh from the
 *    API on mount; a localStorage cache (networkData) provides instant initial
 *    render while the request is in-flight.
 *  - Subnetwork / department admins see only their own single scope.
 *  - switchScope() updates localStorage keys (network_id, sub, date, …) the
 *    same way MainDrawer's network-switch handler does, so all API calls that
 *    read those headers continue to work correctly.
 *  - Active-pages permission filtering is applied to scope items via
 *    buildClusterItems() / buildHospitalItems() in config/scopes.tsx.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Scope } from "@/config/scopes";
import { apiClient } from "@/lib/api/apiClient";
import { getActivePages } from "@/lib/menu/hasAccess";
import {
  buildScopes,
  readLoginDataFromStorage,
  type SubnetworkEntry,
} from "@/lib/menu/buildScopes";

/* -------------------------------------------------------------------------- */
/*  Context types                                                              */
/* -------------------------------------------------------------------------- */

interface ScopeContextValue {
  scope: Scope;
  scopes: Scope[];
  chain: Scope[];
  setScopeId: (id: string) => void;
  switchScope: (id: string) => void;
  hasModule: (path: string) => boolean;
}

const ScopeContext = createContext<ScopeContextValue | undefined>(undefined);

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "mc.activeScopeId";

const FALLBACK_SCOPE: Scope = {
  id: "__loading__",
  level: "hospital",
  name: "",
  shortName: "",
  role: "",
  overviewPath: "/admin",
  items: [],
};

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

export const ScopeProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [scopes, setScopes] = useState<Scope[]>([FALLBACK_SCOPE]);
  const [scopeId, setScopeIdState] = useState<string>(FALLBACK_SCOPE.id);
  // Guard against calling the API more than once per mount
  const fetchedRef = useRef(false);

  /* ------------------------------------------------------------------ */
  /*  Bootstrap from localStorage on first render                        */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const activePages = getActivePages();
    const {
      adminType,
      clusterId,
      clusterName,
      clusterProfileUrl,
      isSingle,
      networkId,
      cachedNetworks,
    } = readLoginDataFromStorage();

    const built = buildScopes({
      adminType,
      clusterId,
      clusterName,
      clusterProfileUrl,
      isSingle,
      activePages,
      subnetworks: cachedNetworks,
    });

    setScopes(built);

    // Determine which scope to activate:
    //  1. Previously stored id (if still valid)
    //  2. The network the user is currently in (sub=true, network_id set)
    //  3. First available scope
    const storedId = localStorage.getItem(STORAGE_KEY);
    const subActive = localStorage.getItem("sub") === "true";
    const currentNetworkScopeId = networkId ? `network:${networkId}` : null;

    const resolvedId = (() => {
      if (storedId && built.some((s) => s.id === storedId)) return storedId;
      if (subActive && currentNetworkScopeId && built.some((s) => s.id === currentNetworkScopeId))
        return currentNetworkScopeId;
      return built[0]?.id ?? FALLBACK_SCOPE.id;
    })();

    setScopeIdState(resolvedId);

    // For cluster admins, refresh subnetwork list from API (same as React app's
    // getNetworksList() called on mount in MainDrawer).
    if (adminType === "cluster" && !isSingle && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchSubnetworks({
        clusterId,
        clusterName,
        clusterProfileUrl,
        isSingle,
        activePages,
        currentScopeId: resolvedId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------ */
  /*  API: fetch fresh subnetwork list (listclustersubnetworks)          */
  /* ------------------------------------------------------------------ */
  const fetchSubnetworks = useCallback(
    async ({
      clusterId,
      clusterName,
      clusterProfileUrl,
      isSingle,
      activePages,
      currentScopeId,
    }: {
      clusterId: string;
      clusterName: string;
      clusterProfileUrl: string;
      isSingle: boolean;
      activePages: string[];
      currentScopeId: string;
    }) => {
      try {
        const res = (await apiClient("POST", "admin", "listclustersubnetworks", {
          body: {},
          shouldUseDefaultToken: false,
          enableLogging: false,
        })) as { content: { data: SubnetworkEntry[] } };

        const networks = res.content.data;

        // Cache for subsequent page loads (mirrors React app networkData storage)
        localStorage.setItem(
          "networkData",
          JSON.stringify(
            networks.map((n) => ({ id: n.id, name: n.name, profile_url: n.profile_url }))
          )
        );

        const built = buildScopes({
          adminType: "cluster",
          clusterId,
          clusterName,
          clusterProfileUrl,
          isSingle,
          activePages,
          subnetworks: networks,
        });

        setScopes(built);

        // Keep current scope if it still exists, else fall back to first
        setScopeIdState((prev) =>
          built.some((s) => s.id === prev) ? prev : (built[0]?.id ?? FALLBACK_SCOPE.id)
        );
      } catch {
        // Silently fail — the cached networkData-based scopes remain active
      }
    },
    []
  );

  /* ------------------------------------------------------------------ */
  /*  Persist active scope id                                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (typeof window !== "undefined" && scopeId !== FALLBACK_SCOPE.id) {
      try {
        window.localStorage.setItem(STORAGE_KEY, scopeId);
      } catch {
        // ignore quota errors
      }
    }
  }, [scopeId]);

  const setScopeId = useCallback((id: string) => {
    setScopeIdState(id);
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Context value                                                       */
  /* ------------------------------------------------------------------ */
  const value = useMemo<ScopeContextValue>(() => {
    const scope = scopes.find((s) => s.id === scopeId) ?? scopes[0] ?? FALLBACK_SCOPE;

    // Ancestor chain for breadcrumbs (root → current)
    const chain: Scope[] = [];
    let cur: Scope | undefined = scope;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parentId ? scopes.find((s) => s.id === cur!.parentId) : undefined;
    }

    const allowedPaths = new Set<string>(
      scope.items.flatMap((i) => {
        if (!("path" in i) || !i.path) return [];
        const nav = i as { path: string; children?: { path: string }[] };
        return [nav.path, ...((nav.children ?? []).map((c) => c.path))];
      })
    );

    return {
      scope,
      scopes,
      chain,
      setScopeId,
      /**
       * Switch to a different network scope.
       * Mirrors the onClick handlers in MainDrawer's network Popover:
       *  - selecting a subnetwork  → sets network_id, sub, date in localStorage
       *  - selecting the cluster   → removes network_id, sub; sets date
       */
      switchScope: (id: string) => {
        const next = scopes.find((s) => s.id === id);
        if (!next) return;

        if (next.level === "hospital" && next.networkId) {
          // User selected a subnetwork
          localStorage.setItem("network_id", next.networkId);
          localStorage.setItem("network_name", next.name);
          if (next.profileUrl !== undefined) {
            localStorage.setItem("network_profile", next.profileUrl);
          }
          localStorage.setItem("sub", "true");
          localStorage.setItem("date", String(Date.now()));
        } else if (next.level === "cluster") {
          // User returned to cluster level (no subnetwork selected)
          localStorage.removeItem("network_id");
          localStorage.removeItem("sub");
          localStorage.setItem("date", String(Date.now()));
        }

        setScopeIdState(id);
        router.push(next.overviewPath);
      },
      hasModule: (path: string) => {
        if (path.startsWith("/admin/ptt")) return allowedPaths.has("/admin/ptt");
        return Array.from(allowedPaths).some(
          (p) => path === p || path.startsWith(p + "/")
        );
      },
    };
  }, [scopes, scopeId, router, setScopeId]);

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
};

/* -------------------------------------------------------------------------- */
/*  Hook                                                                       */
/* -------------------------------------------------------------------------- */

export const useScope = () => {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useScope must be used within ScopeProvider");
  return ctx;
};
