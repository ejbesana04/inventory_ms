import { Navigate, Outlet } from "react-router-dom";
import { LoadingSpinner } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";
import { PATHS } from "./path";

export function FullPageLoading() {
  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center">
      <div className="rounded-2xl border border-border-muted bg-bg-light px-8 py-6 flex flex-col items-center gap-3">
        <LoadingSpinner size="md" />
        <p className="text-sm text-text-muted font-semibold uppercase tracking-wide">Loading</p>
      </div>
    </div>
  );
}

export function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoading />;
  }

  if (user) {
    return <Navigate to={PATHS.APP.DASHBOARD} replace />;
  }

  return <Navigate to={PATHS.LOGIN} replace />;
}

export function ProtectedLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoading />;
  }

  if (!user) {
    return <Navigate to={PATHS.LOGIN} replace />;
  }

  return <Outlet />;
}

type RoleProtectedLayoutProps = {
  allowedRoles: Array<"admin" | "manager">;
  redirectTo?: string;
};

export function RoleProtectedLayout({
  allowedRoles,
  redirectTo = PATHS.APP.DASHBOARD,
}: RoleProtectedLayoutProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoading />;
  }

  if (!user) {
    return <Navigate to={PATHS.LOGIN} replace />;
  }

  if (!allowedRoles.includes(user.role as "admin" | "manager")) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
