import ProtectedRoute from "@/components/ProtectedRoute";

// Ensures every /admin/* page requires authentication.
// Pages that already wrap themselves in <ProtectedRoute> remain unaffected
// (double-wrapping is harmless — the outer check redirects first if needed).
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
