import ProtectedRoute from "@/components/ProtectedRoute";

// Ensures every /cluster/* page requires authentication.
export default function ClusterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
