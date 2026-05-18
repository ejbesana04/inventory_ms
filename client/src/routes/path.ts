const APP_ROOT = "/app";

const p = (segment: string) => `${APP_ROOT}/${segment}`;

export const PATHS = {
  HOME: "/",
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",

  APP: {
    ROOT: APP_ROOT,
    DASHBOARD: p("dashboard"),
    PRODUCTS: p("products"),
    SUPPLIERS: p("suppliers"),
    PURCHASE_ORDERS: p("purchase-orders"),
    SALES: p("sales"),
    REPORTS: p("reports"),
    STOCK_IN: p("stock-in"),
    STOCK_OUT: p("stock-out"),
    USERS: p("users"),
  },
};
