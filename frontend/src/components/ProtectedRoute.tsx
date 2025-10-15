import { type ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute
 * Wrap any page component you want to protect.
 *
 * Usage:
 *   <Route path="/dashboard" element={
 *     <ProtectedRoute><Dashboard /></ProtectedRoute>
 *   } />
 *
 * Optional: pass "to" prop to change redirect path (default: "/login")
 */
export default function ProtectedRoute({
  children,
  to = "/login",
}: {
  children: ReactElement;
  to?: string;
}) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Preserve where the user was trying to go
    return <Navigate to={to} replace state={{ from: location }} />;
  }
  return children;
}