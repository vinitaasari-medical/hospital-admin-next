/**
 * Builds the dynamic Scope[] array from data stored in localStorage after
 * login, mirroring the network/organization switching logic from
 * hospital-admin/src/pages/MainDrawer/MainDrawer.jsx.
 *
 * Logic summary:
 *  - Cluster admin (is_cluster_admin=true, !is_single): cluster scope +
 *    one scope per subnetwork (fetched via listclustersubnetworks API).
 *  - Single-subnetwork or subnetwork/department admin: single hospital scope
 *    for the current network_id.
 *
 * Switching to a network scope sets network_id / sub in localStorage.
 * Switching back to cluster scope removes network_id / sub.
 */

import type { Scope } from "@/config/scopes";
import { buildClusterItems, buildHospitalItems } from "@/config/scopes";

export interface SubnetworkEntry {
  id: string;
  name: string;
  profile_url?: string;
}

export interface BuildScopesParams {
  adminType: "cluster" | "subnetwork" | "department";
  clusterId: string;
  clusterName: string;
  clusterProfileUrl: string;
  isSingle: boolean;
  activePages: string[];
  subnetworks: SubnetworkEntry[];
}

function deriveShortName(name: string): string {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w[0] ?? "").join("").toUpperCase() || "N";
}

/**
 * Build the full list of scopes available to the current user.
 *
 * For cluster admins:
 *   [0] = cluster-level scope (overview of all networks)
 *   [1..N] = one scope per subnetwork
 *
 * For subnetwork / department admins:
 *   [0] = their single subnetwork scope
 */
export function buildScopes(params: BuildScopesParams): Scope[] {
  const {
    adminType,
    clusterId,
    clusterName,
    clusterProfileUrl,
    isSingle,
    activePages,
    subnetworks,
  } = params;

  // Cluster admin with multiple subnetworks
  if (adminType === "cluster" && !isSingle) {
    const clusterScope: Scope = {
      id: `cluster:${clusterId}`,
      level: "cluster",
      name: clusterName,
      shortName: deriveShortName(clusterName),
      role: "Cluster Admin",
      overviewPath: "/admin",
      profileUrl: clusterProfileUrl,
      items: buildClusterItems(activePages),
    };

    const networkScopes: Scope[] = subnetworks.map(
      (net): Scope => ({
        id: `network:${net.id}`,
        level: "hospital",
        name: net.name,
        shortName: deriveShortName(net.name),
        role: "Network Admin",
        parentId: `cluster:${clusterId}`,
        overviewPath: "/admin",
        networkId: net.id,
        profileUrl: net.profile_url ?? "",
        items: buildHospitalItems(activePages),
      })
    );

    return [clusterScope, ...networkScopes];
  }

  // Subnetwork, department, or single-subnetwork cluster admin
  // These are already scoped to a specific network — use the first subnetwork
  // entry (set at login time) or fall back to localStorage.
  const net = subnetworks[0];
  const networkId =
    net?.id ??
    (typeof window !== "undefined" ? (localStorage.getItem("network_id") ?? "") : "");
  const networkName =
    net?.name ??
    (typeof window !== "undefined" ? (localStorage.getItem("network_name") ?? "Network") : "Network");
  const networkProfile =
    net?.profile_url ??
    (typeof window !== "undefined" ? (localStorage.getItem("network_profile") ?? "") : "");

  const roleLabel =
    adminType === "department" ? "Department Admin" : "Network Admin";

  return [
    {
      id: `network:${networkId}`,
      level: "hospital",
      name: networkName,
      shortName: deriveShortName(networkName),
      role: roleLabel,
      overviewPath: "/admin",
      networkId,
      profileUrl: networkProfile,
      items: buildHospitalItems(activePages),
    },
  ];
}

/**
 * Read all the data needed by buildScopes() from localStorage.
 * Mirrors the localStorage keys written by login/page.tsx and useAuth.setUser().
 */
export function readLoginDataFromStorage(): {
  adminType: "cluster" | "subnetwork" | "department";
  clusterId: string;
  clusterName: string;
  clusterProfileUrl: string;
  isSingle: boolean;
  networkId: string | null;
  cachedNetworks: SubnetworkEntry[];
} {
  const isClusterAdmin = localStorage.getItem("is_cluster_admin") === "true";
  const isSingle =
    localStorage.getItem("is_single") === "1" ||
    localStorage.getItem("is_single") === "true";
  const isDepartmentAdmin = localStorage.getItem("subnetworks_departments") === "true";

  const adminType: "cluster" | "subnetwork" | "department" = isClusterAdmin
    ? "cluster"
    : isDepartmentAdmin
    ? "department"
    : "subnetwork";

  const clusterId = localStorage.getItem("cluster_id") ?? "";
  // cluster_profile_url set for cluster admins; cluster_id always set
  const clusterName = isClusterAdmin
    ? (localStorage.getItem("network_name") ?? "")
    : "";
  const clusterProfileUrl = localStorage.getItem("cluster_profile_url") ?? "";

  const networkId = localStorage.getItem("network_id");
  const networkName = localStorage.getItem("network_name") ?? "";
  const networkProfile = localStorage.getItem("network_profile") ?? "";

  let cachedNetworks: SubnetworkEntry[] = [];

  if (isClusterAdmin) {
    // Try the cache stored either at login or after a previous API fetch
    try {
      const raw = localStorage.getItem("networkData");
      if (raw) cachedNetworks = JSON.parse(raw) as SubnetworkEntry[];
    } catch {
      // ignore
    }
  } else {
    // Subnetwork / department admins always have exactly one network
    if (networkId) {
      cachedNetworks = [
        { id: networkId, name: networkName, profile_url: networkProfile },
      ];
    }
  }

  return {
    adminType,
    clusterId,
    clusterName,
    clusterProfileUrl,
    isSingle,
    networkId,
    cachedNetworks,
  };
}
