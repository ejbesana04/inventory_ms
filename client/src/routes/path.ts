const APP_ROOT = "/app";

const p = (segment: string) => `${APP_ROOT}/${segment}`;

export const PATHS = {
  HOME: "/",
  LOGIN: "/login",

  APP: {
    ROOT: APP_ROOT,
    DASHBOARD: p("dashboard"),
    PRODUCTS: p("products"),
    SUPPLIERS: p("suppliers"),
    PURCHASE_ORDERS: p("purchase-orders"),
    SALES: p("sales"),
    STOCK_IN: p("stock-in"),
    STOCK_OUT: p("stock-out"),
    USERS: p("users"),
  },
};
