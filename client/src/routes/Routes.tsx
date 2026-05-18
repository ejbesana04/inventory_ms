import React, { Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthProviderLayout } from "../contexts/AuthContext";
import { PATHS } from "./path";
import { ProtectedLayout, RoleProtectedLayout, RootRedirect } from "./AuthGuards";
import { LoadingSpinner } from "../components/ui";
import { NAV_GROUPS } from "../navigation/modules";

const Dashboard = React.lazy(() => import("../pages/Dashboard"));
const Users = React.lazy(() => import("../pages/users/Users"));
const Login = React.lazy(() => import("../pages/auth/Login"));
const ForgotPassword = React.lazy(() => import("../pages/auth/ForgotPassword"));
// ResetPassword import removed
const ModulePlaceholder = React.lazy(() => import("../pages/ModulePlaceholder"));
const Products = React.lazy(() => import("../pages/products/Products"));
const Suppliers = React.lazy(() => import("../pages/suppliers/Suppliers"));
const PurchaseOrders = React.lazy(() => import("../pages/purchase-orders/PurchaseOrders"));
const Sales = React.lazy(() => import("../pages/sales/Sales"));
const Reports = React.lazy(() => import("../pages/reports/Reports"));
const StockIn = React.lazy(() => import("../pages/stock/StockIn"));
const StockOut = React.lazy(() => import("../pages/stock/StockOut"));

function LazyFallback() {
  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center">
      <div className="rounded-2xl border border-border-muted bg-bg-light px-8 py-6 flex flex-col items-center gap-3">
        <LoadingSpinner size="md" />
        <p className="text-sm text-text-muted font-semibold uppercase tracking-wide">Loading page</p>
      </div>
    </div>
  );
}

const lazyPage = (node: React.ReactElement) => (
  <Suspense fallback={<LazyFallback />}>{node}</Suspense>
);

const RESERVED = new Set([
  "dashboard",
  "users",
  "products",
  "suppliers",
  "purchase-orders",
  "sales",
  "reports",
  "stock-in",
  "stock-out",
]);

const placeholderRoutes = NAV_GROUPS.flatMap((g) => g.items)
  .filter((item) => !item.action && !RESERVED.has(item.path))
  .map((item) => ({
    path: item.path,
    element: lazyPage(<ModulePlaceholder title={item.label} />),
  }));

export const Routes = createBrowserRouter([
  {
    element: <AuthProviderLayout />,
    children: [
      {
        path: "/",
        element: <RootRedirect />,
      },
      {
        path: PATHS.LOGIN,
        element: lazyPage(<Login />),
      },
      {
        path: PATHS.FORGOT_PASSWORD,
        element: lazyPage(<ForgotPassword />),
      },
      // Reset password route removed
      {
        path: PATHS.APP.ROOT,
        element: <ProtectedLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: "dashboard",
            element: lazyPage(<Dashboard />),
          },
          {
            path: "products",
            element: lazyPage(<Products />),
          },
          {
            path: "suppliers",
            element: lazyPage(<Suppliers />),
          },
          {
            path: "purchase-orders",
            element: lazyPage(<PurchaseOrders />),
          },
          {
            path: "sales",
            element: lazyPage(<Sales />),
          },
          {
            path: "reports",
            element: lazyPage(<Reports />),
          },
          {
            path: "users",
            element: <RoleProtectedLayout allowedRoles={["admin", "manager"]} />,
            children: [
              {
                index: true,
                element: lazyPage(<Users />),
              },
            ],
          },
          {
            path: "stock-in",
            element: lazyPage(<StockIn />),
          },
          {
            path: "stock-out",
            element: lazyPage(<StockOut />),
          },
          ...placeholderRoutes,
        ],
      },
    ],
  },
]);